import { cache } from 'react'
import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import { CoachProposalSchema, type CoachProposal } from '@/lib/coach/proposals'
import type { CoachConversation, CoachMessage, CoachMessageMetadata, CoachRole } from '@/types/coach'

export interface SaveMessageParams {
  conversationId: string
  role: CoachRole
  content: string
  metadata?: CoachMessageMetadata | null
}

// ── Read operations (cached) ──────────────────────────────────────────────────

export const getConversations = cache(async (
  userId: string,
): Promise<CoachConversation[]> => {
  const supabase = await getSupabaseServer()

  const { data, error } = await (supabase.from('coach_conversations' as any) as any)
    .select('id, user_id, title, created_at, updated_at')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    throw new DatabaseError(`Failed to fetch coach conversations: ${error.message}`, error)
  }

  return (data ?? []) as CoachConversation[]
})

export const getConversationById = cache(async (
  conversationId: string,
  userId: string,
): Promise<CoachConversation | null> => {
  const supabase = await getSupabaseServer()

  const { data, error } = await (supabase.from('coach_conversations' as any) as any)
    .select('id, user_id, title, created_at, updated_at')
    .eq('id', conversationId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new DatabaseError(`Failed to fetch coach conversation: ${error.message}`, error)
  }

  return (data ?? null) as CoachConversation | null
})

export const getConversationMessages = cache(async (
  conversationId: string,
  limit = 50,
): Promise<CoachMessage[]> => {
  const supabase = await getSupabaseServer()

  const { data, error } = await (supabase.from('coach_messages' as any) as any)
    .select('id, conversation_id, role, content, metadata, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (error) {
    throw new DatabaseError(`Failed to fetch coach messages: ${error.message}`, error)
  }

  return (data ?? []) as CoachMessage[]
})

export const getDailyUsageCount = cache(async (
  userId: string,
): Promise<number> => {
  const supabase = await getSupabaseServer()

  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)

  const { count, error } = await (supabase.from('coach_usage' as any) as any)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', startOfDay.toISOString())

  if (error) {
    throw new DatabaseError(`Failed to check daily coach usage: ${error.message}`, error)
  }

  return count ?? 0
})

// ── Write operations (uncached) ───────────────────────────────────────────────

export async function createConversation(
  userId: string,
  title?: string,
): Promise<CoachConversation> {
  const supabase = await getSupabaseServer()

  const { data, error } = await (supabase.from('coach_conversations' as any) as any)
    .insert({
      user_id: userId,
      title: title ?? 'New Conversation',
    })
    .select('id, user_id, title, created_at, updated_at')
    .single()

  if (error) {
    throw new DatabaseError(`Failed to create coach conversation: ${error.message}`, error)
  }

  return data as CoachConversation
}

export async function updateConversationTitle(
  conversationId: string,
  userId: string,
  title: string,
): Promise<void> {
  const supabase = await getSupabaseServer()

  const { error } = await (supabase.from('coach_conversations' as any) as any)
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
    .eq('user_id', userId)

  if (error) {
    throw new DatabaseError(`Failed to update conversation title: ${error.message}`, error)
  }
}

export async function touchConversation(
  conversationId: string,
): Promise<void> {
  const supabase = await getSupabaseServer()

  const { error } = await (supabase.from('coach_conversations' as any) as any)
    .update({ updated_at: new Date().toISOString() })
    .eq('id', conversationId)

  if (error) {
    console.error('Failed to touch conversation timestamp:', error.message)
  }
}

export async function deleteConversation(
  conversationId: string,
  userId: string,
): Promise<void> {
  const supabase = await getSupabaseServer()

  const { error } = await (supabase.from('coach_conversations' as any) as any)
    .delete()
    .eq('id', conversationId)
    .eq('user_id', userId)

  if (error) {
    throw new DatabaseError(`Failed to delete conversation: ${error.message}`, error)
  }
}

export async function saveCoachMessage(
  params: SaveMessageParams,
): Promise<CoachMessage> {
  const supabase = await getSupabaseServer()

  const { data, error } = await (supabase.from('coach_messages' as any) as any)
    .insert({
      conversation_id: params.conversationId,
      role: params.role,
      content: params.content,
      metadata: params.metadata ?? {},
    })
    .select('id, conversation_id, role, content, metadata, created_at')
    .single()

  if (error) {
    throw new DatabaseError(`Failed to save coach message: ${error.message}`, error)
  }

  // Update conversation updated_at in background
  touchConversation(params.conversationId).catch(() => {})

  return data as CoachMessage
}

// ── Proposals ─────────────────────────────────────────────────────────────────

const MessageRowSchema = z.object({
  conversation_id: z.string(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
})

const StoredProposalsSchema = z.array(z.unknown()).catch([])
const ProposalIdSchema = z.object({ id: z.string() })

// Messages carry no user_id; ownership is the conversation's. Null when the
// message is missing or belongs to someone else's conversation.
async function getOwnedMessageMetadata(
  messageId: string,
  userId: string,
): Promise<Record<string, unknown> | null> {
  const supabase = await getSupabaseServer()

  const { data, error } = await (supabase.from('coach_messages' as any) as any)
    .select('conversation_id, metadata')
    .eq('id', messageId)
    .maybeSingle()

  if (error) {
    throw new DatabaseError(`Failed to fetch coach message: ${error.message}`, error)
  }
  if (!data) return null

  const message = MessageRowSchema.parse(data)
  const conversation = await getConversationById(message.conversation_id, userId)
  if (!conversation) return null
  return message.metadata ?? {}
}

function hasProposalId(stored: unknown, proposalId: string): boolean {
  const parsed = ProposalIdSchema.safeParse(stored)
  return parsed.success && parsed.data.id === proposalId
}

export async function getMessageProposal(
  messageId: string,
  userId: string,
  proposalId: string,
): Promise<CoachProposal | null> {
  const metadata = await getOwnedMessageMetadata(messageId, userId)
  if (!metadata) return null

  const stored = StoredProposalsSchema.parse(metadata.proposals)
    .find(proposal => hasProposalId(proposal, proposalId))
  if (stored === undefined) return null
  return CoachProposalSchema.parse(stored)
}

// Replaces only the proposal with this id; every other proposal and metadata
// field is written back exactly as stored.
export async function updateMessageProposal(
  messageId: string,
  userId: string,
  proposal: CoachProposal,
): Promise<void> {
  const metadata = await getOwnedMessageMetadata(messageId, userId)
  if (!metadata) throw new DatabaseError('Coach message not found')

  const stored = StoredProposalsSchema.parse(metadata.proposals)
  if (!stored.some(candidate => hasProposalId(candidate, proposal.id))) {
    throw new DatabaseError(`Proposal ${proposal.id} not found on coach message`)
  }
  const proposals = stored.map(candidate => hasProposalId(candidate, proposal.id) ? proposal : candidate)

  const supabase = await getSupabaseServer()
  const { error } = await (supabase.from('coach_messages' as any) as any)
    .update({ metadata: { ...metadata, proposals } })
    .eq('id', messageId)

  if (error) {
    throw new DatabaseError(`Failed to update coach proposal: ${error.message}`, error)
  }
}

export async function recordCoachUsage(
  userId: string,
  tokensIn: number,
  tokensOut: number,
): Promise<void> {
  const supabase = await getSupabaseServer()

  const { error } = await (supabase.from('coach_usage' as any) as any)
    .insert({
      user_id: userId,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
    })

  if (error) {
    // Non-blocking error: log rather than failing the message stream
    console.error('Failed to record coach usage:', error.message)
  }
}

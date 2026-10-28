import { cache } from 'react'
import { resolveSupabaseClient } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
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
  runAsAdmin: boolean = false
): Promise<CoachConversation[]> => {
  const supabase = await resolveSupabaseClient(runAsAdmin)

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
  runAsAdmin: boolean = false
): Promise<CoachConversation | null> => {
  const supabase = await resolveSupabaseClient(runAsAdmin)

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
  runAsAdmin: boolean = false
): Promise<CoachMessage[]> => {
  const supabase = await resolveSupabaseClient(runAsAdmin)

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
  runAsAdmin: boolean = false
): Promise<number> => {
  const supabase = await resolveSupabaseClient(runAsAdmin)

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
  runAsAdmin: boolean = false
): Promise<CoachConversation> {
  const supabase = await resolveSupabaseClient(runAsAdmin)

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
  runAsAdmin: boolean = false
): Promise<void> {
  const supabase = await resolveSupabaseClient(runAsAdmin)

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
  runAsAdmin: boolean = false
): Promise<void> {
  const supabase = await resolveSupabaseClient(runAsAdmin)

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
  runAsAdmin: boolean = false
): Promise<void> {
  const supabase = await resolveSupabaseClient(runAsAdmin)

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
  runAsAdmin: boolean = false
): Promise<CoachMessage> {
  const supabase = await resolveSupabaseClient(runAsAdmin)

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
  touchConversation(params.conversationId, runAsAdmin).catch(() => {})

  return data as CoachMessage
}

export async function recordCoachUsage(
  userId: string,
  tokensIn: number,
  tokensOut: number,
  runAsAdmin: boolean = false
): Promise<void> {
  const supabase = await resolveSupabaseClient(runAsAdmin)

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

import type { CoachProposal } from '@/lib/coach/proposals'

export type CoachRole = 'user' | 'assistant' | 'system'

export interface CoachConversation {
  id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface ProposedRoutineExercise {
  exercise_name: string
  target_sets: number
  target_reps: number
  progression_model?: 'double' | 'rep_sum'
  rep_sum_target?: number | null
}

export interface ProposedRoutine {
  title: string
  notes?: string
  exercises: ProposedRoutineExercise[]
}

export interface CoachMessageMetadata {
  proposed_routine?: ProposedRoutine
  saved_routine_id?: string
  proposals?: CoachProposal[]
  tokens_in?: number
  tokens_out?: number
  tool_invocations?: Array<{
    name: string
    input: Record<string, unknown>
    result?: unknown
  }>
}

export interface CoachMessage {
  id: string
  conversation_id: string
  role: CoachRole
  content: string
  metadata: CoachMessageMetadata | null
  created_at: string
}

export type CoachStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_call'; tool: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool: string; result: unknown }
  | { type: 'routine_proposed'; routine: ProposedRoutine }
  | { type: 'proposal'; proposal: CoachProposal }
  | { type: 'message_complete'; message_id: string; conversation_id: string }
  | { type: 'error'; message: string }

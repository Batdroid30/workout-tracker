import { z } from 'zod'
import { getExercises } from '@/lib/data/exercises'
import { createRoutine } from '@/lib/data/routines'
import type { ProposedRoutine, ProposedRoutineExercise } from '@/types/coach'

const CreateRoutineInputSchema = z.object({
  title: z.string().min(1).max(100),
  notes: z.string().optional(),
  exercises: z.array(
    z.object({
      exercise_name: z.string().min(1),
      target_sets: z.number().int().min(1).max(10),
      target_reps: z.number().int().min(1).max(100),
      progression_model: z.enum(['double', 'rep_sum']).optional(),
      rep_sum_target: z.number().nullable().optional(),
    })
  ).min(1).max(15),
})

const SuggestSwapInputSchema = z.object({
  current_exercise: z.string().min(1),
  reason: z.string().min(1),
})

export interface ToolExecutionResult {
  success: boolean
  message: string
  proposed_routine?: ProposedRoutine
  saved_routine_id?: string
  data?: unknown
}

export async function executeCoachTool(
  toolName: string,
  args: Record<string, unknown>,
  userId: string
): Promise<ToolExecutionResult> {
  switch (toolName) {
    case 'create_routine':
      return await handleCreateRoutine(args, userId)

    case 'suggest_exercise_swap':
      return await handleSuggestSwap(args)

    default:
      return {
        success: false,
        message: `Unknown tool: ${toolName}`,
      }
  }
}

async function handleCreateRoutine(
  args: Record<string, unknown>,
  userId: string
): Promise<ToolExecutionResult> {
  const parseResult = CreateRoutineInputSchema.safeParse(args)
  if (!parseResult.success) {
    return {
      success: false,
      message: `Invalid routine parameters: ${parseResult.error.message}`,
    }
  }

  const { title, notes, exercises: inputExercises } = parseResult.data
  const allExercises = await getExercises()

  const resolvedExercises: Array<{
    exercise_id: string
    target_sets: number
    target_reps: number
    progression_model?: 'double' | 'rep_sum'
    rep_sum_target?: number | null
  }> = []

  const proposedExercises: ProposedRoutineExercise[] = []

  for (const item of inputExercises) {
    const searchLower = item.exercise_name.toLowerCase().trim()

    // Match exact or contains
    const match = allExercises.find(
      e => e.name.toLowerCase() === searchLower
    ) || allExercises.find(
      e => e.name.toLowerCase().includes(searchLower) || searchLower.includes(e.name.toLowerCase())
    )

    if (match) {
      resolvedExercises.push({
        exercise_id: match.id,
        target_sets: item.target_sets,
        target_reps: item.target_reps,
        progression_model: item.progression_model,
        rep_sum_target: item.rep_sum_target,
      })
      proposedExercises.push({
        exercise_name: match.name,
        target_sets: item.target_sets,
        target_reps: item.target_reps,
        progression_model: item.progression_model,
        rep_sum_target: item.rep_sum_target,
      })
    } else {
      // Keep exercise name for visual proposal even if not currently in DB
      proposedExercises.push({
        exercise_name: item.exercise_name,
        target_sets: item.target_sets,
        target_reps: item.target_reps,
        progression_model: item.progression_model,
        rep_sum_target: item.rep_sum_target,
      })
    }
  }

  const proposedRoutine: ProposedRoutine = {
    title,
    notes,
    exercises: proposedExercises,
  }

  // If we matched at least 1 exercise in DB, auto-save to user routines table!
  let savedRoutineId: string | undefined = undefined
  if (resolvedExercises.length > 0) {
    try {
      const created = await createRoutine(userId, {
        title,
        notes,
        exercises: resolvedExercises,
      })
      savedRoutineId = created.id
    } catch (err) {
      console.error('Failed to auto-save routine:', err)
    }
  }

  return {
    success: true,
    message: savedRoutineId
      ? `Successfully created routine "${title}" with ${proposedExercises.length} exercises (saved to your routines list).`
      : `Generated routine "${title}" with ${proposedExercises.length} exercises.`,
    proposed_routine: proposedRoutine,
    saved_routine_id: savedRoutineId,
  }
}

async function handleSuggestSwap(
  args: Record<string, unknown>
): Promise<ToolExecutionResult> {
  const parseResult = SuggestSwapInputSchema.safeParse(args)
  if (!parseResult.success) {
    return { success: false, message: 'Invalid swap arguments' }
  }

  const { current_exercise, reason } = parseResult.data
  const allExercises = await getExercises()
  const searchLower = current_exercise.toLowerCase()

  const current = allExercises.find(
    e => e.name.toLowerCase().includes(searchLower) || searchLower.includes(e.name.toLowerCase())
  )

  if (!current) {
    return {
      success: true,
      message: `Consider alternatives with similar movement patterns for ${current_exercise}.`,
    }
  }

  // Find exercises with same muscle_group and movement_pattern
  const alternatives = allExercises
    .filter(e =>
      e.id !== current.id &&
      e.muscle_group === current.muscle_group &&
      e.movement_pattern === current.movement_pattern
    )
    .slice(0, 3)
    .map(e => e.name)

  return {
    success: true,
    message: alternatives.length > 0
      ? `Alternatives for ${current.name} (given "${reason}"): ${alternatives.join(', ')}`
      : `No direct match found in catalog for ${current.name}, try similar free weight or machine variations.`,
    data: { alternatives },
  }
}

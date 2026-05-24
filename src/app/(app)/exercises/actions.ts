'use server'

import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { revalidateAll } from '@/lib/cache'
import type { MuscleGroup, MovementPattern } from '@/types/database'

// ── Shared validation data ────────────────────────────────────────────────────

const MUSCLE_GROUP_VALUES = [
  'chest', 'back', 'lats', 'shoulders', 'traps',
  'biceps', 'triceps', 'forearms',
  'quads', 'hamstrings', 'glutes', 'calves',
  'core',
] as const

const MOVEMENT_PATTERN_VALUES = ['push', 'pull', 'hinge', 'squat', 'carry', 'isolation'] as const

const CreateExerciseSchema = z.object({
  name:              z.string().min(1).max(100),
  muscle_group:      z.enum(MUSCLE_GROUP_VALUES),
  secondary_muscles: z.array(z.enum(MUSCLE_GROUP_VALUES)).default([]),
  movement_pattern:  z.enum(MOVEMENT_PATTERN_VALUES),
  equipment:         z.string().max(100).nullable(),
})

// ── Actions ───────────────────────────────────────────────────────────────────

interface UpdateExerciseMetaParams {
  muscle_group?: MuscleGroup
  movement_pattern?: MovementPattern
  secondary_muscles?: MuscleGroup[] | null
}

export async function updateExerciseAction(
  id: string,
  updates: UpdateExerciseMetaParams,
): Promise<{ success: true } | { error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  if (!updates.muscle_group && !updates.movement_pattern && updates.secondary_muscles === undefined) {
    return { error: 'No fields to update' }
  }

  const supabase = await getSupabaseServer()

  const { error } = await supabase
    .from('exercises')
    .update(updates)
    .eq('id', id)

  if (error) return { error: 'Failed to update exercise. Please try again.' }

  revalidateAll()

  return { success: true }
}

export async function createExerciseAction(
  params: z.infer<typeof CreateExerciseSchema>,
): Promise<{ id: string } | { error: string }> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Unauthorized' }

  const parsed = CreateExerciseSchema.safeParse(params)
  if (!parsed.success) return { error: 'Invalid input' }

  const { name, muscle_group, secondary_muscles, movement_pattern, equipment } = parsed.data
  const trimmedName = name.trim()

  const supabase = await getSupabaseServer()

  // Duplicate check and insert in one round-trip via upsert-style select + insert
  const { data: existing } = await supabase
    .from('exercises')
    .select('id')
    .ilike('name', trimmedName)
    .maybeSingle()

  if (existing) return { error: 'An exercise with this name already exists.' }

  const { data, error } = await supabase
    .from('exercises')
    .insert({
      name:              trimmedName,
      muscle_group,
      secondary_muscles: secondary_muscles.length > 0 ? secondary_muscles : null,
      movement_pattern,
      equipment:         equipment || null,
      is_custom:         true,
      created_by:        session.user.id,
    })
    .select('id')
    .single()

  if (error) return { error: 'Failed to create exercise. Please try again.' }

  revalidateAll()

  return { id: data.id }
}

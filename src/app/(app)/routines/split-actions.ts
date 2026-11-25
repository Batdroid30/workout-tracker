'use server'

import { requireAuth } from '@/lib/auth'
import { revalidateAll } from '@/lib/cache'
import { getSupabaseServer } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import { activateSplit, deleteSplit, insertSplit, insertSplitItems } from '@/lib/data/splits'
import { PositionSchema, SplitIdSchema, SplitInputSchema, splitRenamePayload, type SplitInput } from './split-schemas'

type ActionResult = { success: true; id?: string } | { success: false; error: string }

function failure(error: unknown): ActionResult {
  return { success: false, error: error instanceof Error ? error.message : 'Something went wrong. Please try again.' }
}

async function assertOwnSplit(userId: string, splitId: string): Promise<void> {
  const supabase = await getSupabaseServer()
  const { data, error } = await supabase
    .from('training_splits')
    .select('id')
    .eq('id', splitId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new DatabaseError(`Failed to load split: ${error.message}`, error)
  if (!data) throw new Error('Split not found')
}

export async function saveSplitAction(splitId: string | null, input: SplitInput): Promise<ActionResult> {
  try {
    const { userId } = await requireAuth()
    const parsed = SplitInputSchema.parse(input)
    const supabase = await getSupabaseServer()

    let id = splitId
    if (id) {
      SplitIdSchema.parse(id)
      await assertOwnSplit(userId, id)
      const { error } = await supabase.from('training_splits').update(splitRenamePayload(parsed.name)).eq('id', id).eq('user_id', userId)
      if (error) throw new DatabaseError(`Failed to rename split: ${error.message}`, error)
      const { error: clearError } = await supabase.from('training_split_items').delete().eq('split_id', id)
      if (clearError) throw new DatabaseError(`Failed to update split days: ${clearError.message}`, clearError)
    } else {
      id = await insertSplit(userId, parsed.name)
    }

    await insertSplitItems(id, parsed.items)

    revalidateAll()
    return { success: true, id }
  } catch (error: unknown) {
    return failure(error)
  }
}

export async function deleteSplitAction(splitId: string): Promise<ActionResult> {
  try {
    const { userId } = await requireAuth()
    SplitIdSchema.parse(splitId)
    await deleteSplit(splitId, userId)
    revalidateAll()
    return { success: true }
  } catch (error: unknown) {
    return failure(error)
  }
}

export async function setActiveSplitAction(splitId: string): Promise<ActionResult> {
  try {
    const { userId } = await requireAuth()
    SplitIdSchema.parse(splitId)
    await assertOwnSplit(userId, splitId)
    await activateSplit(splitId, userId)
    revalidateAll()
    return { success: true }
  } catch (error: unknown) {
    return failure(error)
  }
}

// Both "Skip to next" and "Start from here" point the rotation at a position;
// the pointer wins until a newer split workout is logged.
export async function setSplitPositionAction(splitId: string, position: number): Promise<ActionResult> {
  try {
    const { userId } = await requireAuth()
    SplitIdSchema.parse(splitId)
    const parsedPosition = PositionSchema.parse(position)
    const supabase = await getSupabaseServer()
    const { error } = await supabase
      .from('training_splits')
      .update({ skip_to_position: parsedPosition, skip_set_at: new Date().toISOString() })
      .eq('id', splitId)
      .eq('user_id', userId)
    if (error) throw new DatabaseError(`Failed to move your split: ${error.message}`, error)
    revalidateAll()
    return { success: true }
  } catch (error: unknown) {
    return failure(error)
  }
}

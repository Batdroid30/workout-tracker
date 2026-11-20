'use server'

import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { revalidateAll } from '@/lib/cache'
import { updateProfile } from '@/lib/data/profile'
import { getTrainingCycle } from '@/lib/data/training-cycle'
import type { TrainingCycle } from '@/lib/training-cycle'
import { restartPayload } from './restart-payload'

export async function restartCycleAction(): Promise<{ success: true }> {
  const { userId } = await requireAuth()
  await updateProfile(userId, restartPayload('cycle', new Date()))
  revalidateAll()
  return { success: true }
}

export async function restartPhaseAction(): Promise<{ success: true }> {
  const { userId } = await requireAuth()
  await updateProfile(userId, restartPayload('phase', new Date()))
  revalidateAll()
  return { success: true }
}

export async function dismissBreakPromptAction(): Promise<{ success: true }> {
  const { userId } = await requireAuth()
  await updateProfile(userId, { break_prompt_dismissed_at: new Date().toISOString() })
  revalidateAll()
  return { success: true }
}

const CycleQuerySchema = z.object({ at: z.string().datetime({ offset: true }).optional() }).optional()

export async function getTrainingCycleAction(input?: { at?: string }): Promise<TrainingCycle> {
  const { userId } = await requireAuth()
  const parsed = CycleQuerySchema.parse(input)
  return getTrainingCycle(userId, parsed?.at)
}

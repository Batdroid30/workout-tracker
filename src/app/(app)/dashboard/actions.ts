'use server'

import { requireAuth } from '@/lib/auth'
import { getRecentExerciseLoads } from '@/lib/data/insights'
import { generateDeloadRoutine, type DeloadPrescription, type FatigueAssessment } from '@/lib/algorithms'

// ─── Deload routine ──────────────────────────────────────────────────────────
//
// Lazy: only invoked when the user taps "Generate my deload week" inside
// the DeloadCard. Saves a DB query for every dashboard view that doesn't
// need a deload.
//
// userId comes from the server session — never trust a client-passed id.
export async function getDeloadRoutineAction(
  confidence: FatigueAssessment['confidence'] = 'medium',
): Promise<DeloadPrescription[]> {
  const { session } = await requireAuth()

  const loads = await getRecentExerciseLoads(session.user.id)
  return generateDeloadRoutine(loads, confidence)
}

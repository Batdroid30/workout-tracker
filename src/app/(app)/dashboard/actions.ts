'use server'

import { auth } from '@/lib/auth'
import { getRecentExerciseLoads } from '@/lib/data/insights'
import { generateDeloadRoutine, type DeloadPrescription } from '@/lib/algorithms'

// ─── Deload routine ──────────────────────────────────────────────────────────
//
// Lazy: only invoked when the user taps "Generate my deload week" inside
// the DeloadCard. Saves a DB query for every dashboard view that doesn't
// need a deload.
//
// userId comes from the server session — never trust a client-passed id.
export async function getDeloadRoutineAction(): Promise<DeloadPrescription[]> {
  const session = await auth()
  if (!session?.user?.id) return []

  const loads = await getRecentExerciseLoads(session.user.id)
  return generateDeloadRoutine(loads)
}

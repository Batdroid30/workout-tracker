import type { VolumeStatus } from '@/lib/phase-coach'
import type { MuscleGroup } from '@/types/database'

interface WeeklyMusclePoint {
  muscleGroup: MuscleGroup
  setCount: number
  status: VolumeStatus
}

// Untrained muscles are left out so the body map shows them neutral instead of
// painting "Below MV" red on every muscle the user simply hasn't hit yet.
export function trainedStatusByMuscle(
  points: readonly WeeklyMusclePoint[],
): Partial<Record<MuscleGroup, VolumeStatus>> {
  const statusByMuscle: Partial<Record<MuscleGroup, VolumeStatus>> = {}
  for (const { muscleGroup, setCount, status } of points) {
    if (setCount > 0) statusByMuscle[muscleGroup] = status
  }
  return statusByMuscle
}

import { tonnes } from '@/lib/home'

const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const KG_PER_TONNE = 1000

interface WorkoutSummaryInput {
  durationSeconds: number | null
  volumeKg: number
  sets: { id: string; is_warmup: boolean | null }[]
  prSetIds: Set<string>
}

export interface WorkoutSummary {
  duration: string
  volume: string
  workingSets: number
  prCount: number
}

function formatDuration(seconds: number | null): string {
  const totalMinutes = Math.floor((seconds ?? 0) / SECONDS_PER_MINUTE)
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '0m'
  const hours = Math.floor(totalMinutes / MINUTES_PER_HOUR)
  const minutes = totalMinutes % MINUTES_PER_HOUR
  return hours > 0 ? `${hours}h ${minutes}` : `${minutes}m`
}

function formatVolume(kg: number): string {
  if (!Number.isFinite(kg) || kg <= 0) return '0 kg'
  return kg >= KG_PER_TONNE ? `${tonnes(kg)} t` : `${Math.round(kg)} kg`
}

// The four numbers at the top of a past workout. Warm-ups don't count.
export function workoutSummary({ durationSeconds, volumeKg, sets, prSetIds }: WorkoutSummaryInput): WorkoutSummary {
  const workingSets = sets.filter(set => !set.is_warmup)
  return {
    duration: formatDuration(durationSeconds),
    volume: formatVolume(volumeKg),
    workingSets: workingSets.length,
    prCount: workingSets.filter(set => prSetIds.has(set.id)).length,
  }
}

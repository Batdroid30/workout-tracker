import type { ReactNode } from 'react'
import { Card } from '@/components/ui'
import { ReadinessCheckIn } from './ReadinessCheckIn'
import type { ReadinessSummary } from '@/lib/home'

interface ThisWeekStatsProps {
  workoutsDone: number
  workoutsGoal: number
  volumeTonnes: string
  readiness: ReadinessSummary | null
}

const TONE_CLASS: Record<ReadinessSummary['tone'], string> = {
  positive: 'text-positive',
  caution: 'text-caution',
  negative: 'text-negative',
}

export function ThisWeekStats({ workoutsDone, workoutsGoal, volumeTonnes, readiness }: ThisWeekStatsProps) {
  return (
    <Card as="section">
      <h2 className="t-title-3">This week</h2>
      <dl className="mt-3 grid grid-cols-3 gap-3">
        <Stat label="Workouts" value={`${workoutsDone}/${workoutsGoal}`} />
        <Stat label="Volume" value={`${volumeTonnes} t`} />
        <Stat
          label="Readiness"
          value={readiness ? String(readiness.score) : '—'}
          detail={readiness
            ? <span className={`text-sm font-medium ${TONE_CLASS[readiness.tone]}`}>{readiness.word}</span>
            : <ReadinessCheckIn />}
        />
      </dl>
    </Card>
  )
}

function Stat({ label, value, detail = null }: { label: string; value: string; detail?: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="t-caption">{label}</dt>
      <dd className="t-value mt-1">{value}</dd>
      {detail && <dd className="mt-0.5">{detail}</dd>}
    </div>
  )
}

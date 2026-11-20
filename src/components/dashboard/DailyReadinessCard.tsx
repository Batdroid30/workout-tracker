'use client'

import { useState, useTransition } from 'react'
import { logReadinessAction } from '@/app/(app)/dashboard/actions'
import { Button, ToggleChip } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { Activity, Battery, Moon, Sparkles } from 'lucide-react'

interface ReadinessProps {
  todayReadiness: {
    sleep_score: number
    soreness_score: number
    energy_score: number
  } | null
}

const SCORES = [1, 2, 3, 4, 5] as const

export function DailyReadinessCard({ todayReadiness }: ReadinessProps) {
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  const [sleep, setSleep] = useState<number>(3)
  const [soreness, setSoreness] = useState<number>(3)
  const [energy, setEnergy] = useState<number>(3)

  if (todayReadiness) {
    const avgScore = (todayReadiness.sleep_score + todayReadiness.soreness_score + todayReadiness.energy_score) / 3
    const isGreat = avgScore >= 4

    return (
      <div className="card px-3 py-3 flex items-center gap-1.5 whitespace-nowrap text-xs text-secondary">
        {isGreat && <Sparkles className="w-3.5 h-3.5 shrink-0 text-positive" />}
        <span className="font-semibold text-primary">Readiness</span>
        <span aria-hidden="true">·</span>
        <span className="mono min-w-0">
          Sleep {todayReadiness.sleep_score} · Recovery {todayReadiness.soreness_score} · Energy {todayReadiness.energy_score}
        </span>
      </div>
    )
  }

  const handleSave = () => {
    startTransition(async () => {
      try {
        await logReadinessAction({
          sleep_score: sleep,
          soreness_score: soreness,
          energy_score: energy,
        })
      } catch (error: unknown) {
        console.error('Failed to save readiness', error)
        toast.error("Couldn't save readiness. Try again.")
      }
    })
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-primary">How do you feel today?</h2>
        <Button
          size="sm"
          fullWidth={false}
          onClick={handleSave}
          loading={isPending}
        >
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>

      <div className="space-y-2">
        <ScoreRow icon={<Moon className="w-4 h-4" />} label="Sleep" value={sleep} setValue={setSleep} />
        <ScoreRow icon={<Activity className="w-4 h-4" />} label="Recovery" value={soreness} setValue={setSoreness} />
        <ScoreRow icon={<Battery className="w-4 h-4" />} label="Energy" value={energy} setValue={setEnergy} />
      </div>
    </div>
  )
}

function ScoreRow({
  icon,
  label,
  value,
  setValue,
}: {
  icon: React.ReactNode
  label: string
  value: number
  setValue: (val: number) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <div className="flex items-center gap-2 w-20 shrink-0 text-xs text-primary">
        <span className="text-secondary">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex flex-1 gap-1">
        {SCORES.map((score) => (
          <ToggleChip
            key={score}
            size="sm"
            selected={value === score}
            onClick={() => setValue(score)}
            className="flex-1 min-w-9 px-0"
          >
            {score}
          </ToggleChip>
        ))}
      </div>
    </div>
  )
}

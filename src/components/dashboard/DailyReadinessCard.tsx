'use client'

import { useState, useTransition } from 'react'
import { logReadinessAction } from '@/app/(app)/dashboard/actions'
import { Button } from '@/components/ui/Button'
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
      <div className="glass px-3 py-3 rounded-[var(--radius-card)] border border-[var(--glass-border)] flex items-center gap-1.5 whitespace-nowrap text-[11px] text-[var(--text-low)]">
        {isGreat && <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-500" />}
        <span className="font-semibold text-[var(--text-hi)]">Readiness</span>
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
    <div className="glass p-4 rounded-[var(--radius-card)] border border-[var(--glass-border)]">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text-hi)]">How do you feel today?</h2>
        <Button
          variant="primary"
          className="!w-auto !min-h-0 h-8 px-3"
          onClick={handleSave}
          disabled={isPending}
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
      <div className="flex items-center gap-2 w-20 shrink-0 text-xs text-[var(--text-hi)]">
        <span className="text-[var(--text-low)]">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex flex-1 gap-1">
        {SCORES.map((score) => (
          <button
            key={score}
            type="button"
            aria-pressed={value === score}
            onClick={() => setValue(score)}
            className={`flex-1 h-8 min-w-8 rounded-md font-medium text-sm transition-colors ${
              value === score
                ? 'bg-[var(--accent)] text-[var(--accent-on)]'
                : 'bg-[var(--glass-surface)] text-[var(--text-low)] hover:bg-[var(--glass-surface-hover)] hover:text-[var(--text-hi)]'
            }`}
          >
            {score}
          </button>
        ))}
      </div>
    </div>
  )
}

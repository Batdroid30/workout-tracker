'use client'

import { useState, useTransition } from 'react'
import { logReadinessAction } from '@/app/(app)/dashboard/actions'
import { Button } from '@/components/ui/Button'
import { Activity, Battery, Moon, Sparkles } from 'lucide-react'

interface ReadinessProps {
  todayReadiness: {
    sleep_score: number
    soreness_score: number
    energy_score: number
  } | null
}

export function DailyReadinessCard({ todayReadiness }: ReadinessProps) {
  const [isPending, startTransition] = useTransition()
  
  const [sleep, setSleep] = useState<number>(3)
  const [soreness, setSoreness] = useState<number>(3)
  const [energy, setEnergy] = useState<number>(3)

  if (todayReadiness) {
    const avgScore = (todayReadiness.sleep_score + todayReadiness.soreness_score + todayReadiness.energy_score) / 3
    const isGreat = avgScore >= 4

    return (
      <div className="glass p-5 rounded-[var(--radius-card)] border border-[var(--glass-border)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--text-hi)] uppercase">Daily Readiness</h2>
          {isGreat && <Sparkles className="w-4 h-4 text-emerald-500" />}
        </div>
        
        <div className="flex justify-between items-center text-sm">
          <div className="flex flex-col items-center gap-1">
            <Moon className="w-4 h-4 text-[var(--text-low)]" />
            <span className="font-medium text-[var(--text-hi)]">{todayReadiness.sleep_score}/5</span>
            <span className="text-[11px] text-[var(--text-low)]">Sleep</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Activity className="w-4 h-4 text-[var(--text-low)]" />
            <span className="font-medium text-[var(--text-hi)]">{todayReadiness.soreness_score}/5</span>
            <span className="text-[11px] text-[var(--text-low)]">Recovery</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Battery className="w-4 h-4 text-[var(--text-low)]" />
            <span className="font-medium text-[var(--text-hi)]">{todayReadiness.energy_score}/5</span>
            <span className="text-[11px] text-[var(--text-low)]">Energy</span>
          </div>
        </div>
      </div>
    )
  }

  const handleSave = () => {
    startTransition(async () => {
      await logReadinessAction({
        sleep_score: sleep,
        soreness_score: soreness,
        energy_score: energy,
      })
    })
  }

  return (
    <div className="glass p-5 rounded-[var(--radius-card)] border border-[var(--glass-border)]">
      <h2 className="text-sm font-semibold tracking-wide text-[var(--text-hi)] uppercase mb-4">
        Log Readiness
      </h2>

      <div className="space-y-4 mb-6">
        <ScoreSlider 
          icon={<Moon className="w-4 h-4" />}
          label="Sleep Quality" 
          value={sleep} 
          setValue={setSleep} 
          minLabel="Poor" 
          maxLabel="Great" 
        />
        <ScoreSlider 
          icon={<Activity className="w-4 h-4" />}
          label="Muscle Recovery" 
          value={soreness} 
          setValue={setSoreness} 
          minLabel="Sore" 
          maxLabel="Fresh" 
        />
        <ScoreSlider 
          icon={<Battery className="w-4 h-4" />}
          label="Energy Level" 
          value={energy} 
          setValue={setEnergy} 
          minLabel="Low" 
          maxLabel="High" 
        />
      </div>

      <Button
        variant="primary"
        className="w-full"
        onClick={handleSave}
        disabled={isPending}
      >
        {isPending ? 'Saving...' : 'Save Readiness'}
      </Button>
    </div>
  )
}

function ScoreSlider({
  icon,
  label,
  value,
  setValue,
  minLabel,
  maxLabel,
}: {
  icon: React.ReactNode
  label: string
  value: number
  setValue: (val: number) => void
  minLabel: string
  maxLabel: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-sm text-[var(--text-hi)]">
        <span className="text-[var(--text-low)]">{icon}</span>
        <span className="font-medium">{label}</span>
      </div>
      <div className="flex justify-between items-center gap-1">
        {[1, 2, 3, 4, 5].map((score) => (
          <button
            key={score}
            onClick={() => setValue(score)}
            className={`flex-1 h-10 rounded-md font-medium text-sm transition-colors ${
              value === score
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--glass-surface)] text-[var(--text-low)] hover:bg-[var(--glass-surface-hover)] hover:text-[var(--text-hi)]'
            }`}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-[var(--text-low)] mt-1 px-1">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

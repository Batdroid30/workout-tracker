'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { Activity, Battery, Moon } from 'lucide-react'
import { BottomSheet, Button, ToggleChip } from '@/components/ui'
import { useToast } from '@/providers/ToastProvider'
import { logReadinessAction } from '@/app/(app)/dashboard/actions'

const SCORES = [1, 2, 3, 4, 5] as const
const DEFAULT_SCORE = 3

// Today's check-in: three 1–5 answers, opened from the This week card.
export function ReadinessCheckIn() {
  const toast = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [sleep, setSleep] = useState(DEFAULT_SCORE)
  const [soreness, setSoreness] = useState(DEFAULT_SCORE)
  const [energy, setEnergy] = useState(DEFAULT_SCORE)

  const save = () =>
    startTransition(async () => {
      try {
        await logReadinessAction({ sleep_score: sleep, soreness_score: soreness, energy_score: energy })
        setIsOpen(false)
      } catch (error: unknown) {
        console.error('Failed to save readiness', error)
        toast.error("Couldn't save your check-in. Try again.")
      }
    })

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="focus-ring -ml-1 rounded px-1 text-sm font-medium text-primary underline underline-offset-4"
      >
        Check in
      </button>
      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="How do you feel today?">
        <div className="space-y-3">
          <ScoreRow icon={<Moon className="w-4 h-4" aria-hidden="true" />} label="Sleep" value={sleep} onChange={setSleep} />
          <ScoreRow icon={<Activity className="w-4 h-4" aria-hidden="true" />} label="Recovery" value={soreness} onChange={setSoreness} />
          <ScoreRow icon={<Battery className="w-4 h-4" aria-hidden="true" />} label="Energy" value={energy} onChange={setEnergy} />
        </div>
        <Button className="mt-5" onClick={save} loading={isPending}>Save</Button>
      </BottomSheet>
    </>
  )
}

function ScoreRow({ icon, label, value, onChange }: { icon: ReactNode; label: string; value: number; onChange: (score: number) => void }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-2">
      <div className="flex w-24 shrink-0 items-center gap-2 text-sm text-primary">
        <span className="text-secondary">{icon}</span>
        {label}
      </div>
      <div className="flex flex-1 gap-1">
        {SCORES.map(score => (
          <ToggleChip key={score} size="sm" selected={value === score} onClick={() => onChange(score)} className="flex-1 min-w-9 px-0">
            {score}
          </ToggleChip>
        ))}
      </div>
    </div>
  )
}

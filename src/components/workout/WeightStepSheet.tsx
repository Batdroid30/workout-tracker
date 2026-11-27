'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { ToggleChip } from '@/components/ui'

export const WEIGHT_STEP_OPTIONS_KG = [1, 1.25, 2, 2.5, 5] as const

interface WeightStepSheetProps {
  current: number
  onPick: (step: number) => void
  onClose: () => void
}

export function WeightStepSheet({ current, onPick, onClose }: WeightStepSheetProps) {
  return (
    <BottomSheet isOpen onClose={onClose} title="Weight step">
      <p className="t-caption mb-3">The smallest jump suggestions use for this lift.</p>
      <div className="flex flex-wrap gap-2">
        {WEIGHT_STEP_OPTIONS_KG.map(step => (
          <ToggleChip key={step} selected={step === current} onClick={() => onPick(step)}>
            {`${step} kg`}
          </ToggleChip>
        ))}
      </div>
    </BottomSheet>
  )
}

'use client'

import { BottomSheet } from '@/components/ui/BottomSheet'
import { Chip } from '@/components/ui'
import {
  confidenceLabel, effortLabel, formatReferenceLine, modifierLabel, type LoadMode,
} from '@/lib/suggestions/explanation-labels'
import type { ExercisePlan } from '@/lib/suggestions/types'

const MIN_SUGGESTIONS_FOR_HIT_RATE = 3

interface WhyThisWeightSheetProps {
  plan: ExercisePlan
  hitRate: { hits: number; total: number } | null
  loadMode: LoadMode
  bodyweightKg: number
  onClose: () => void
}

export function WhyThisWeightSheet({ plan, hitRate, loadMode, bodyweightKg, onClose }: WhyThisWeightSheetProps) {
  const { explanation } = plan
  const referenceLine = formatReferenceLine(explanation, loadMode, bodyweightKg)
  const hasHitRate = hitRate !== null && hitRate.total >= MIN_SUGGESTIONS_FOR_HIT_RATE

  return (
    <BottomSheet isOpen onClose={onClose} title="Why this weight">
      <div className="space-y-4">
        <p className="text-sm text-primary">{explanation.reason}</p>
        {referenceLine && <p className="t-caption mono">{referenceLine}</p>}

        {explanation.effortSources.length > 0 && (
          <ul className="space-y-1">
            {explanation.effortSources.map((source, index) => (
              <li key={index} className="flex justify-between text-sm">
                <span className="text-secondary">{`Set ${index + 1}`}</span>
                <span className="text-primary">{effortLabel(source)}</span>
              </li>
            ))}
          </ul>
        )}

        {explanation.modifiers.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {explanation.modifiers.map(modifier => (
              <Chip key={modifier} tone="caution">{modifierLabel(modifier)}</Chip>
            ))}
          </div>
        )}

        <p className="t-caption">{confidenceLabel(explanation.confidence)}</p>
        {hasHitRate && (
          <p className="t-caption">{`You've hit ${hitRate.hits} of ${hitRate.total} suggestions on this lift`}</p>
        )}
      </div>
    </BottomSheet>
  )
}

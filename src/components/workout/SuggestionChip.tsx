'use client'

import { Zap } from 'lucide-react'
import { rpeToRIR } from '@/lib/algorithms'
import { formatAddedWeight } from '@/lib/load'
import type { SetRole, SetSuggestion } from '@/lib/suggestions/types'

const ROLE_LABELS: Record<SetRole, string | null> = {
  straight: null,
  top: 'Top set',
  backoff: 'Back-off',
}

interface LoadDisplay {
  isBodyweight?: boolean
  isWeightedBodyweight?: boolean
  userBodyweight: number
}

function formatSuggestedLoad(suggestion: SetSuggestion, display: LoadDisplay): string {
  const reps = suggestion.repsMax !== null ? `${suggestion.reps}–${suggestion.repsMax}` : `${suggestion.reps}`
  if (display.isBodyweight) return `BW × ${reps}`
  if (display.isWeightedBodyweight) {
    const added = formatAddedWeight(Math.max(suggestion.weightKg, display.userBodyweight), display.userBodyweight)
    return `${added} × ${reps}`
  }
  return `${suggestion.weightKg} kg × ${reps}`
}

interface SuggestionChipProps extends LoadDisplay {
  suggestion: SetSuggestion
  /** Shown once per exercise, so most chips get none. */
  reason?: string
  onUse: () => void
  onExplain?: () => void
}

export function SuggestionChip({ suggestion, reason, onUse, onExplain, ...display }: SuggestionChipProps) {
  const roleLabel = ROLE_LABELS[suggestion.role]
  const summary = (
    <>
      <span className="flex flex-wrap items-center gap-x-1.5">
        <Zap className="w-3 h-3 shrink-0 text-secondary" aria-hidden="true" />
        <span className="mono text-xs tabular-nums text-primary">{formatSuggestedLoad(suggestion, display)}</span>
        <span className="mono text-xs tabular-nums text-secondary">
          · RPE {suggestion.rpeTarget} ({rpeToRIR(suggestion.rpeTarget)} RIR)
        </span>
        {roleLabel && <span className="text-xs font-medium text-secondary">{roleLabel}</span>}
      </span>
      {reason && <span className="block truncate text-xs text-tertiary">{reason}</span>}
      {suggestion.optional && <span className="block text-xs text-caution">Optional — skip this set this deload week</span>}
    </>
  )
  const summaryClass = 'min-w-0 flex-1 px-2 py-1 text-left'

  return (
    <div className="mb-1 flex items-center rounded-control border border-border bg-surface-raised">
      {onExplain
        ? <button type="button" onClick={onExplain} className={summaryClass}>{summary}</button>
        : <div className={summaryClass}>{summary}</div>}
      <button
        type="button"
        onClick={onUse}
        className="min-h-11 shrink-0 px-3 text-xs font-semibold text-primary active:scale-95 transition-transform"
      >Use</button>
    </div>
  )
}

import { Bot, Sparkles, Dumbbell, LineChart, ShieldCheck } from 'lucide-react'
import { CoachSuggestionChips } from './CoachSuggestionChips'

interface CoachEmptyStateProps {
  onSelectPrompt: (prompt: string) => void
}

export function CoachEmptyState({ onSelectPrompt }: CoachEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-card bg-surface-raised text-secondary">
        <Bot className="h-8 w-8" />
      </div>

      <h3 className="text-lg font-bold text-primary">AI strength &amp; conditioning coach</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-secondary">
        I read your real-time sets, volume landmarks, fatigue signals, and PR history to give precision training guidance.
      </p>

      {/* Feature bullets */}
      <div className="mt-6 grid grid-cols-3 gap-2 w-full max-w-sm text-left">
        <div className="card p-2.5">
          <LineChart className="h-4 w-4 text-secondary mb-1" />
          <div className="text-xs font-semibold text-primary">Volume audit</div>
          <div className="text-xs text-tertiary">Spots neglected muscles</div>
        </div>
        <div className="card p-2.5">
          <Dumbbell className="h-4 w-4 text-secondary mb-1" />
          <div className="text-xs font-semibold text-primary">Routine engine</div>
          <div className="text-xs text-tertiary">Builds &amp; saves splits</div>
        </div>
        <div className="card p-2.5">
          <ShieldCheck className="h-4 w-4 text-secondary mb-1" />
          <div className="text-xs font-semibold text-primary">Fatigue guard</div>
          <div className="text-xs text-tertiary">Flags deload timing</div>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div className="mt-6 w-full max-w-md">
        <div className="flex items-center gap-1.5 justify-center text-xs font-medium text-secondary mb-2">
          <Sparkles className="h-3.5 w-3.5 text-secondary" /> Start with a prompt:
        </div>
        <CoachSuggestionChips onSelect={onSelectPrompt} />
      </div>
    </div>
  )
}

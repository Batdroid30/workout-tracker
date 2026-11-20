import { Sparkles } from 'lucide-react'

interface CoachSuggestionChipsProps {
  onSelect: (prompt: string) => void
  disabled?: boolean
}

const PROMPTS = [
  'What should I train today based on my recovery?',
  'Review my training volume and balance this week',
  'Do I have any stalled lifts and how do I fix them?',
  'Build me a 4-day Upper/Lower hypertrophy split',
  'Am I ready for a deload week?',
]

export function CoachSuggestionChips({ onSelect, disabled }: CoachSuggestionChipsProps) {
  return (
    <div className="flex flex-wrap gap-2 py-2">
      {PROMPTS.map((prompt, idx) => (
        <button
          key={idx}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
          className="focus-ring flex min-h-10 items-center gap-1.5 rounded-pill bg-surface-raised px-3 py-1.5 text-left text-xs text-secondary transition-all hover:text-primary active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          <Sparkles className="h-3 w-3 text-tertiary shrink-0" />
          <span>{prompt}</span>
        </button>
      ))}
    </div>
  )
}

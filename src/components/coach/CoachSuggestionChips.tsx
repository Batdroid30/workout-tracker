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
          className="flex items-center gap-1.5 rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-300 transition-all hover:border-teal-500/50 hover:bg-zinc-800/80 hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        >
          <Sparkles className="h-3 w-3 text-teal-400 shrink-0" />
          <span>{prompt}</span>
        </button>
      ))}
    </div>
  )
}

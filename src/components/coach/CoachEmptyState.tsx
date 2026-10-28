import { Bot, Sparkles, Dumbbell, LineChart, ShieldCheck } from 'lucide-react'
import { CoachSuggestionChips } from './CoachSuggestionChips'

interface CoachEmptyStateProps {
  onSelectPrompt: (prompt: string) => void
}

export function CoachEmptyState({ onSelectPrompt }: CoachEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 shadow-xl shadow-teal-500/5">
        <Bot className="h-8 w-8" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-75" />
          <span className="relative inline-flex h-4 w-4 rounded-full bg-teal-500" />
        </span>
      </div>

      <h3 className="text-lg font-bold text-zinc-100">AI Strength & Conditioning Coach</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-zinc-400">
        I read your real-time sets, volume landmarks, fatigue signals, and PR history to give precision training guidance.
      </p>

      {/* Feature bullets */}
      <div className="mt-6 grid grid-cols-3 gap-2 w-full max-w-sm text-left">
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <LineChart className="h-4 w-4 text-teal-400 mb-1" />
          <div className="text-[11px] font-semibold text-zinc-200">Volume Audit</div>
          <div className="text-[10px] text-zinc-500">Spots neglected muscles</div>
        </div>
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <Dumbbell className="h-4 w-4 text-teal-400 mb-1" />
          <div className="text-[11px] font-semibold text-zinc-200">Routine Engine</div>
          <div className="text-[10px] text-zinc-500">Builds & saves splits</div>
        </div>
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-2.5">
          <ShieldCheck className="h-4 w-4 text-teal-400 mb-1" />
          <div className="text-[11px] font-semibold text-zinc-200">Fatigue Guard</div>
          <div className="text-[10px] text-zinc-500">Flags deload timing</div>
        </div>
      </div>

      {/* Suggestion Chips */}
      <div className="mt-6 w-full max-w-md">
        <div className="flex items-center gap-1.5 justify-center text-xs font-medium text-zinc-400 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-teal-400" /> Start with a prompt:
        </div>
        <CoachSuggestionChips onSelect={onSelectPrompt} />
      </div>
    </div>
  )
}

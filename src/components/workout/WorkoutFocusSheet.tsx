'use client'

import { useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Exercise } from '@/types/database'
import { useExerciseStore } from '@/store/exercise.store'
import { getDefaultExercisesForFocus } from '@/lib/workout-intelligence'

// ─── "What are you hitting?" focus picker ─────────────────────────────────────
//
// Shown on first entry to a blank workout (no routine, no exercises yet).
// Tap a focus tile → we synthesize a starter exercise list using
// getDefaultExercisesForFocus() and hand it back to the parent, which adds
// them to the active workout.
//
// All logic is client-side: exercises come from the Zustand cache, frequency
// from the parent (already fetched via getUserExerciseFrequency Server Action).
// Zero DB calls happen inside this component.

type FocusKey = 'chest' | 'back' | 'shoulders' | 'legs' | 'glutes' | 'arms' | 'push' | 'pull' | 'core'

interface FocusOption {
  key:   FocusKey
  label: string
  blurb: string
}

const FOCUS_OPTIONS: FocusOption[] = [
  { key: 'push',      label: 'Push',      blurb: 'Chest, shoulders, triceps' },
  { key: 'pull',      label: 'Pull',      blurb: 'Back, lats, biceps' },
  { key: 'legs',      label: 'Legs',      blurb: 'Quads, hamstrings, calves' },
  { key: 'chest',     label: 'Chest',     blurb: 'Press + isolation' },
  { key: 'back',      label: 'Back',      blurb: 'Rows + lats' },
  { key: 'shoulders', label: 'Shoulders', blurb: 'Press + lateral work' },
  { key: 'arms',      label: 'Arms',      blurb: 'Biceps, triceps, forearms' },
  { key: 'glutes',    label: 'Glutes',    blurb: 'Hinge + isolation' },
  { key: 'core',      label: 'Core',      blurb: 'Abs + carries' },
]

interface WorkoutFocusSheetProps {
  isOpen: boolean
  onClose: () => void
  /** Server-Action result, keyed exercise_id → set count (last 90 days). */
  usageFrequency: Record<string, number>
  /**
   * Called with the suggested exercise list once the user picks a focus.
   * Empty array means the user skipped — the parent should leave the
   * workout blank.
   */
  onPick: (exercises: Exercise[]) => void
}

export function WorkoutFocusSheet({
  isOpen,
  onClose,
  usageFrequency,
  onPick,
}: WorkoutFocusSheetProps) {
  const { exercises, load, isLoading } = useExerciseStore()

  // Warm the cache when the sheet opens (no-op if fresh)
  useEffect(() => {
    if (isOpen) load()
  }, [isOpen, load])

  // Frequency comes in as a plain object — convert to Map once for the algorithm
  const frequencyMap = useMemo(
    () => new Map(Object.entries(usageFrequency)),
    [usageFrequency],
  )

  if (!isOpen) return null

  const handlePick = (focusKey: FocusKey) => {
    const picked = getDefaultExercisesForFocus(focusKey, exercises, frequencyMap)
    onPick(picked)
    onClose()
  }

  const handleSkip = () => {
    onPick([])
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070d1f] lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[500px] lg:border-l lg:border-[#334155] animate-in slide-in-from-bottom duration-300">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#334155]">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#4a5568] leading-none mb-0.5">
            New workout
          </p>
          <h2 className="text-lg font-black italic uppercase tracking-tight text-white">
            What are you hitting?
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 hover:bg-[#151b2d] rounded-lg transition-colors text-[#adb4ce]"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Focus grid ── */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-xs font-body text-[#4a5568] mb-4 leading-relaxed">
          Pick a focus and we'll load 4–5 starter exercises based on what you train most.
          You can change anything before starting.
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          {FOCUS_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => handlePick(opt.key)}
              disabled={isLoading}
              className={cn(
                'flex flex-col items-start gap-1 p-4 rounded-xl border text-left transition-all',
                'bg-[#0c1324] border-[#334155]',
                'hover:border-[#CCFF00]/40 hover:bg-[#CCFF00]/5',
                'active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100',
              )}
            >
              <span className="text-base font-black uppercase tracking-tight text-white">
                {opt.label}
              </span>
              <span className="text-[11px] font-body text-[#4a5568] leading-snug">
                {opt.blurb}
              </span>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center mt-6">
            <div className="w-5 h-5 border-2 border-[#CCFF00] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* ── Skip — start blank ── */}
      <div className="p-4 border-t border-[#334155]">
        <button
          onClick={handleSkip}
          className="w-full h-11 flex items-center justify-center text-xs font-black uppercase tracking-wider text-[#4a5568] hover:text-[#adb4ce] transition-colors"
        >
          Skip — start blank
        </button>
      </div>
    </div>
  )
}

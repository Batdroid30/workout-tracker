'use client'

import { useEffect, useMemo } from 'react'
import { X } from 'lucide-react'
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
  usageFrequency: Record<string, number>
  onPick: (exercises: Exercise[]) => void
}

export function WorkoutFocusSheet({
  isOpen,
  onClose,
  usageFrequency,
  onPick,
}: WorkoutFocusSheetProps) {
  const { exercises, load, isLoading } = useExerciseStore()

  useEffect(() => {
    if (isOpen) load()
  }, [isOpen, load])

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
    <div
      className="fixed inset-0 z-50 flex flex-col lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[500px] animate-in slide-in-from-bottom duration-300"
      style={{ background: 'var(--bg-0)', borderLeft: '1px solid var(--glass-border)' }}
    >

      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 py-4"
        style={{ borderBottom: '1px solid var(--glass-border)' }}
      >
        <div>
          <p className="t-label mb-0.5">New workout</p>
          <h2 className="t-display-s">What are you hitting?</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 rounded-[var(--radius-inner)] transition-colors hover:bg-white/[0.06]"
          style={{ color: 'var(--text-mid)' }}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Focus grid ── */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="t-caption mb-4 leading-relaxed">
          Pick a focus and we'll load 4–5 starter exercises based on what you train most.
          You can change anything before starting.
        </p>

        <div className="grid grid-cols-2 gap-2.5">
          {FOCUS_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => handlePick(opt.key)}
              disabled={isLoading}
              className="flex flex-col items-start gap-1 p-4 rounded-[var(--radius-inner)] text-left transition-all active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100 hover:opacity-90"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--glass-border)',
              }}
            >
              <span className="text-base font-semibold uppercase tracking-tight" style={{ color: 'var(--text-hi)' }}>
                {opt.label}
              </span>
              <span className="t-caption leading-snug">{opt.blurb}</span>
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="flex items-center justify-center mt-6">
            <div
              className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
          </div>
        )}
      </div>

      {/* ── Skip ── */}
      <div className="p-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <button
          onClick={handleSkip}
          className="w-full h-11 flex items-center justify-center text-xs font-medium uppercase tracking-wider transition-colors hover:opacity-80"
          style={{ color: 'var(--text-faint)' }}
        >
          Skip — start blank
        </button>
      </div>
    </div>
  )
}

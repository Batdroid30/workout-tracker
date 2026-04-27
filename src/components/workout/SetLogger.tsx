'use client'

import { SetRow }               from './SetRow'
import { WarmupRamp }           from './WarmupRamp'
import { PlateCalculator }      from './PlateCalculator'
import { RestTimer }            from './RestTimer'
import { PRBanner }             from './PRBanner'
import type { ActiveExercise, PRCheckResult } from '@/types/database'
import { Plus, Check, MoreVertical, Calculator, Timer } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useWorkoutStore }      from '@/store/workout.store'
import { usePRStore }           from '@/store/pr.store'
import { useExerciseHistory }   from '@/hooks/useExerciseHistory'
import { useOverloadSuggestion } from '@/hooks/useOverloadSuggestion'
import { useDialog }            from '@/providers/DialogProvider'
import { getSupabaseClient }    from '@/lib/supabase/client'
import { upsertExercisePreference } from '@/lib/data/exercise-preferences'

const DEFAULT_REST = 90

interface SetLoggerProps {
  exerciseIndex: number
  exercise: ActiveExercise
  onReplaceExercise?: () => void
}

export function SetLogger({ exerciseIndex, exercise, onReplaceExercise }: SetLoggerProps) {
  const { updateSet, markSetDone, addSet, addWarmupSet, removeExercise, removeSet, moveExerciseUp, moveExerciseDown, updateExerciseRestSeconds } = useWorkoutStore()
  const { loadPRsForExercises, checkLocalPR } = usePRStore()
  const [menuOpen,          setMenuOpen]          = useState(false)
  const [plateCalcOpen,     setPlateCalcOpen]     = useState(false)
  const [showRestTimer,     setShowRestTimer]      = useState(false)
  const [restTimerKey,      setRestTimerKey]       = useState(0)
  const [showDurationPicker, setShowDurationPicker] = useState(false)
  const [activePRs,         setActivePRs]         = useState<PRCheckResult[]>([])
  const prDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dialog = useDialog()

  const { history }    = useExerciseHistory(exercise.exercise.id)
  const { suggestion, lastWeight, lastReps } = useOverloadSuggestion(exercise.exercise.id)

  // Load current PRs for this exercise so we can detect them in real-time
  useEffect(() => {
    loadPRsForExercises([exercise.exercise.id])
  }, [exercise.exercise.id, loadPRsForExercises])

  // Clean up auto-dismiss timer on unmount
  useEffect(() => {
    return () => {
      if (prDismissTimer.current) clearTimeout(prDismissTimer.current)
    }
  }, [])

  // ── Per-exercise rest seconds ─────────────────────────────────────────────
  // Initial value: from store (persisted in localStorage) or hard default
  const [restSeconds, setRestSeconds] = useState<number>(exercise.rest_seconds ?? DEFAULT_REST)

  // On first render only: if store has no preference, check DB for a saved one
  useEffect(() => {
    if (exercise.rest_seconds !== undefined) return  // already hydrated
    let cancelled = false

    async function loadFromDb() {
      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data } = await supabase
        .from('user_exercise_preferences')
        .select('rest_seconds')
        .eq('user_id', user.id)
        .eq('exercise_id', exercise.exercise.id)
        .single()

      if (cancelled || !data) return

      setRestSeconds(data.rest_seconds)
      updateExerciseRestSeconds(exerciseIndex, data.rest_seconds)
    }

    loadFromDb()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise.exercise.id])

  const handleRestSecondsChange = useCallback((seconds: number) => {
    setRestSeconds(seconds)
    updateExerciseRestSeconds(exerciseIndex, seconds)
    // Fire-and-forget — UI is already updated optimistically
    upsertExercisePreference(exercise.exercise.id, seconds)
    setShowDurationPicker(false)
  }, [exerciseIndex, exercise.exercise.id, updateExerciseRestSeconds])

  const handleSetCompleted = useCallback(() => {
    setRestTimerKey(k => k + 1)
    setShowRestTimer(true)
  }, [])

  // Working weight = first non-warmup set with a weight entered
  const workingWeight = exercise.sets.find(s => !s.is_warmup && s.weight_kg > 0)?.weight_kg ?? 0

  // ── Rest timer label helper ───────────────────────────────────────────────
  const restLabel = restSeconds >= 60
    ? `${Math.floor(restSeconds / 60)}:${String(restSeconds % 60).padStart(2, '0')}`
    : `${restSeconds}s`

  return (
    <div className="glass-panel rounded-xl overflow-hidden mb-4 border border-[#334155]">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#334155] bg-[#0c1324]">
        <div>
          <h3 className="font-black text-base text-[#CCFF00] uppercase tracking-tight">{exercise.exercise.name}</h3>
          <p className="text-[10px] text-[#4a5568] uppercase tracking-[0.15em] mt-0.5">{exercise.exercise.muscle_group}</p>
        </div>
        <div className="flex items-center gap-1">
          {/* Per-exercise rest timer pill */}
          <button
            onClick={() => setShowDurationPicker(true)}
            className="flex items-center gap-1 h-7 px-2.5 bg-[#151b2d] border border-[#334155] rounded-lg hover:border-[#CCFF00]/40 transition-colors"
            aria-label="Set rest timer duration"
          >
            <Timer className="w-3 h-3 text-[#4a5568]" />
            <span className="text-[10px] font-black text-[#adb4ce] tabular-nums">{restLabel}</span>
          </button>

          {/* Plate calculator trigger */}
          <button
            onClick={() => setPlateCalcOpen(true)}
            className="text-[#4a5568] hover:text-[#adb4ce] p-2 hover:bg-[#151b2d] rounded-lg transition-colors"
            aria-label="Plate calculator"
          >
            <Calculator className="w-4 h-4" />
          </button>

          {/* Exercise menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-[#4a5568] hover:text-[#adb4ce] p-2 hover:bg-[#151b2d] rounded-lg transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#0c1324] border border-[#334155] rounded-xl shadow-xl overflow-hidden z-20">
                <button onClick={() => { onReplaceExercise?.(); setMenuOpen(false) }} className="w-full text-left px-4 py-3 text-sm font-bold text-[#dce1fb] hover:bg-[#151b2d] transition-colors">Replace Exercise</button>
                <button onClick={() => { moveExerciseUp(exerciseIndex); setMenuOpen(false) }} className="w-full text-left px-4 py-3 text-sm font-bold text-[#dce1fb] hover:bg-[#151b2d] transition-colors">Move Up</button>
                <button onClick={() => { moveExerciseDown(exerciseIndex); setMenuOpen(false) }} className="w-full text-left px-4 py-3 text-sm font-bold text-[#dce1fb] hover:bg-[#151b2d] transition-colors border-b border-[#334155]">Move Down</button>
                <button
                  onClick={async () => {
                    setMenuOpen(false)
                    const confirmed = await dialog.confirm({ title: 'Remove Exercise', description: 'Remove this exercise from the workout?', danger: true, confirmText: 'Remove' })
                    if (confirmed) removeExercise(exerciseIndex)
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Remove Exercise
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coach suggestion — shown when last session data exists */}
      {suggestion && lastWeight !== null && lastReps !== null && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e293b] bg-[#CCFF00]/5">
          <span className="text-[9px] font-black text-[#CCFF00] uppercase tracking-widest">Coach</span>
          <span className="text-[10px] text-[#4a5568] font-body">
            Last: {lastWeight}kg × {lastReps}
          </span>
          <span className="text-sm font-black text-[#CCFF00] tracking-tight">
            → {suggestion.weight_kg}×{suggestion.target_reps}
          </span>
        </div>
      )}

      {/* Warmup ramp — shown when working weight is entered; tappable to add sets */}
      <WarmupRamp
        workingWeight={workingWeight}
        onAddSet={(weight, reps) => addWarmupSet(exerciseIndex, weight, reps)}
      />

      {/* Column Headers — mirrors SetRow row-1 layout exactly */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1e293b]">
        <span className="w-14 text-center text-[9px] font-black text-[#334155] uppercase tracking-widest">Set · Prev</span>
        <span className="flex-1 text-center text-[9px] font-black text-[#334155] uppercase tracking-widest">kg</span>
        <span className="flex-1 text-center text-[9px] font-black text-[#334155] uppercase tracking-widest">Reps</span>
        <span className="w-10 text-center text-[9px] font-black text-[#334155] uppercase tracking-widest"><Check className="w-3 h-3 mx-auto" /></span>
      </div>

      {/* Rows */}
      <div className="px-4 py-3">
        {exercise.sets.map((set, setIndex) => {
          const prevRecord = history[setIndex]
          const prevText   = prevRecord ? `${prevRecord.weight_kg}×${prevRecord.reps}` : '-'

          return (
            <SetRow
              key={set.id}
              set={set}
              prevSetText={prevText}
              onChange={(updates) => updateSet(exerciseIndex, setIndex, updates)}
              onDone={() => {
                const currentSet = exercise.sets[setIndex]
                const wasCompleted = currentSet.completed
                markSetDone(exerciseIndex, setIndex)
                if (!wasCompleted) {
                  handleSetCompleted()
                  // Real-time PR detection — client-side only, server confirms on save
                  if (!currentSet.is_warmup && currentSet.weight_kg > 0 && currentSet.reps > 0) {
                    const prs = checkLocalPR(exercise.exercise.id, currentSet.weight_kg, currentSet.reps)
                    if (prs.length > 0) {
                      if (prDismissTimer.current) clearTimeout(prDismissTimer.current)
                      setActivePRs(prs)
                    }
                  }
                }
              }}
              onRemove={() => removeSet(exerciseIndex, setIndex)}
            />
          )
        })}

        <div className="flex gap-2 mt-2">
          {/* Add Warmup — secondary, left */}
          <button
            onClick={() => addWarmupSet(exerciseIndex)}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 text-[11px] font-black text-orange-400 bg-orange-500/5 hover:bg-orange-500/10 rounded-lg transition-colors border border-orange-500/20 hover:border-orange-500/30 uppercase tracking-widest"
          >
            <Plus className="w-3 h-3" /> Warmup
          </button>

          {/* Add Working Set — primary, right */}
          <button
            onClick={() => addSet(exerciseIndex)}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 text-[11px] font-black text-[#CCFF00] bg-[#CCFF00]/5 hover:bg-[#CCFF00]/10 rounded-lg transition-colors border border-[#CCFF00]/10 hover:border-[#CCFF00]/20 uppercase tracking-widest"
          >
            <Plus className="w-3 h-3" /> Add Set
          </button>
        </div>
      </div>

      {/* Plate calculator modal */}
      <PlateCalculator
        isOpen={plateCalcOpen}
        onClose={() => setPlateCalcOpen(false)}
        initialWeight={workingWeight || 100}
      />

      {/* Per-exercise rest timer */}
      {showRestTimer && (
        <RestTimer
          key={restTimerKey}
          seconds={restSeconds}
          onSkip={() => setShowRestTimer(false)}
          onComplete={() => setShowRestTimer(false)}
        />
      )}

      {/* Rest duration picker */}
      <RestDurationPicker
        isOpen={showDurationPicker}
        current={restSeconds}
        onChange={handleRestSecondsChange}
        onClose={() => setShowDurationPicker(false)}
      />

      {/* Real-time PR celebration — auto-dismisses after 5s */}
      {activePRs.length > 0 && (
        <PRBanner
          prs={activePRs}
          exerciseName={exercise.exercise.name}
          onDismiss={() => setActivePRs([])}
        />
      )}
    </div>
  )
}

// ─── Rest Duration Picker ─────────────────────────────────────────────────────
// Uses the shared BottomSheet component so the overlay pattern stays DRY.

const REST_PRESETS = [
  { label: '30s',  seconds: 30  },
  { label: '1m',   seconds: 60  },
  { label: '1:30', seconds: 90  },
  { label: '2m',   seconds: 120 },
  { label: '3m',   seconds: 180 },
  { label: '5m',   seconds: 300 },
] as const

interface RestDurationPickerProps {
  isOpen: boolean
  current: number
  onChange: (seconds: number) => void
  onClose: () => void
}

function RestDurationPicker({ isOpen, current, onChange, onClose }: RestDurationPickerProps) {
  const [custom, setCustom] = useState('')

  const handleCustomSubmit = () => {
    const parsed = parseInt(custom, 10)
    if (!isNaN(parsed) && parsed >= 10) onChange(parsed)
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Rest Duration"
      icon={<Timer className="w-4 h-4 text-[#CCFF00]" />}
    >
      {/* Preset grid */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {REST_PRESETS.map(p => (
          <button
            key={p.seconds}
            onClick={() => onChange(p.seconds)}
            className={`py-3 rounded-xl font-black text-sm transition-all active:scale-95 border ${
              current === p.seconds
                ? 'bg-[#CCFF00] text-[#020617] border-[#CCFF00]'
                : 'bg-[#151b2d] text-[#adb4ce] border-[#334155] hover:border-[#CCFF00]/40'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom input */}
      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          placeholder="Custom (seconds)"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
          className="flex-1 h-11 bg-[#151b2d] border border-[#334155] rounded-xl px-4 text-sm font-black text-white placeholder:text-[#334155] focus:outline-none focus:border-[#CCFF00]/50"
        />
        <button
          onClick={handleCustomSubmit}
          className="h-11 px-5 bg-[#CCFF00] text-[#020617] font-black text-sm rounded-xl active:scale-95 transition-transform hover:bg-[#abd600]"
        >
          Set
        </button>
      </div>
      <p className="text-[10px] text-[#334155] font-body mt-2">
        Saved per exercise — pre-fills next time you log this exercise.
      </p>
    </BottomSheet>
  )
}

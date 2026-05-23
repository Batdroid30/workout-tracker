'use client'

import { SetRow }               from './SetRow'
import { WarmupRamp }           from './WarmupRamp'
import { PRBanner }             from './PRBanner'
import type { ActiveExercise, PRCheckResult } from '@/types/database'
import { Plus, Check, MoreVertical, Calculator, Timer, ChevronDown } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useState, useEffect, useCallback } from 'react'
import { useWorkoutStore }      from '@/store/workout.store'
import { usePRStore }           from '@/store/pr.store'
import { useLastWorkoutSets }   from '@/hooks/useLastWorkoutSets'
import { useDialog }            from '@/providers/DialogProvider'
import { getSupabaseClient }    from '@/lib/supabase/client'
import { upsertExercisePreference } from '@/lib/data/exercise-preferences'
import { getCurrentDUPScheme } from '@/lib/workout-intelligence'
import { cn } from '@/lib/utils'

const DEFAULT_REST = 90

interface SupersetCandidate {
  index: number
  name: string
}

interface SetLoggerProps {
  exerciseIndex: number
  exercise: ActiveExercise
  onReplaceExercise?: () => void
  onOpenPlateCalc: (weight: number) => void
  onRestTimerStart: (restSeconds: number) => void
  isCollapsed?: boolean
  onExpand?:    () => void
  // Superset controls — provided by the parent workout page
  onSupersetWith?:   (otherIndex: number) => void
  supersetCandidates?: SupersetCandidate[]
  onUnpairSuperset?:   () => void
}

export function SetLogger({
  exerciseIndex,
  exercise,
  onReplaceExercise,
  onOpenPlateCalc,
  onRestTimerStart,
  isCollapsed = false,
  onExpand,
  onSupersetWith,
  supersetCandidates,
  onUnpairSuperset,
}: SetLoggerProps) {
  const { updateSet, markSetDone, addSet, addWarmupSet, removeExercise, removeSet, insertSet, moveExerciseUp, moveExerciseDown, updateExerciseRestSeconds } = useWorkoutStore()

  const isBodyweight = exercise.exercise.equipment === 'bodyweight' &&
    !exercise.exercise.name.toLowerCase().includes('weighted')
  const { loadPRsForExercises, checkLocalPR } = usePRStore()
  const [menuOpen,            setMenuOpen]            = useState(false)
  const [showDurationPicker,  setShowDurationPicker]  = useState(false)
  const [showSupersetPicker,  setShowSupersetPicker]  = useState(false)
  const [activePRs,          setActivePRs]          = useState<PRCheckResult[]>([])
  const dialog = useDialog()

  const exerciseType = exercise.exercise.movement_pattern === 'isolation' ? 'isolation' : 'compound'
  const { sets: lastWorkoutSets } = useLastWorkoutSets(
    exercise.exercise.id,
    exerciseType,
    exercise.progression_model ?? null,
    exercise.rep_sum_target ?? null,
  )

  useEffect(() => {
    loadPRsForExercises([exercise.exercise.id])
  }, [exercise.exercise.id, loadPRsForExercises])

  const [restSeconds, setRestSeconds] = useState<number>(exercise.rest_seconds ?? DEFAULT_REST)

  useEffect(() => {
    if (exercise.rest_seconds !== undefined) return
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
    upsertExercisePreference(exercise.exercise.id, seconds)
    setShowDurationPicker(false)
  }, [exerciseIndex, exercise.exercise.id, updateExerciseRestSeconds])

  const handleSetCompleted = useCallback(() => {
    onRestTimerStart(restSeconds)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restSeconds, onRestTimerStart])

  const dupRpeTarget  = getCurrentDUPScheme().rpeTarget
  const workingWeight = exercise.sets.find(s => !s.is_warmup && s.weight_kg > 0)?.weight_kg ?? 0

  const sessionVolume = exercise.sets
    .filter(s => s.completed && !s.is_warmup && s.weight_kg > 0 && s.reps > 0)
    .reduce((sum, s) => sum + s.weight_kg * s.reps, 0)

  const isRepSum          = exercise.progression_model === 'rep_sum'
  const repSumTarget      = exercise.rep_sum_target ?? 0
  const sessionRepsLogged = exercise.sets
    .filter(s => s.completed && !s.is_warmup && s.reps > 0)
    .reduce((sum, s) => sum + s.reps, 0)

  const restLabel = restSeconds >= 60
    ? `${Math.floor(restSeconds / 60)}:${String(restSeconds % 60).padStart(2, '0')}`
    : `${restSeconds}s`

  // ── Collapsed view ───────────────────────────────────────────────────────
  if (isCollapsed) {
    const workingSets   = exercise.sets.filter(s => !s.is_warmup)
    const completedSets = workingSets.filter(s => s.completed).length
    const totalSets     = workingSets.length
    const isDone        = totalSets > 0 && completedSets === totalSets
    const targetReps    = workingSets[0]?.reps ?? 0

    return (
      <button
        onClick={onExpand}
        className="w-full glass hover:border-[var(--accent-line)] mb-2 active:scale-[0.99] transition-all"
        aria-label={`Expand ${exercise.exercise.name}`}
      >
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="text-left min-w-0 flex-1">
            <h3 className={cn(
              'font-semibold text-[13px] truncate',
              isDone ? 'text-[var(--text-low)] line-through' : 'text-[var(--accent)]',
            )}>
              {exercise.exercise.name}
            </h3>
            <p className="text-[10px] text-[var(--text-faint)] uppercase tracking-[0.15em] mt-0.5">
              {exercise.exercise.muscle_group}
              {targetReps > 0 && (
                <span className="text-[var(--text-faint)]"> · {totalSets}×{targetReps}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              'mono text-[11px] tabular-nums',
              isDone ? 'text-[var(--accent)]' : 'text-[var(--text-mid)]',
            )}>
              {completedSets}/{totalSets}
            </span>
            <ChevronDown className="w-4 h-4 text-[var(--text-faint)]" />
          </div>
        </div>
      </button>
    )
  }

  return (
    <div className="glass mb-4 overflow-hidden">

      {/* ── Exercise header ─────────────────────────────────────────────── */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--glass-border)' }}
      >
        <div>
          <h3 className="font-semibold text-[15px] text-[var(--accent)]">{exercise.exercise.name}</h3>
          <p className="text-[10px] text-[var(--text-faint)] uppercase tracking-[0.15em] mt-0.5">
            {exercise.exercise.muscle_group}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {/* Rest timer pill */}
          <button
            onClick={() => setShowDurationPicker(true)}
            className="flex items-center gap-1 h-7 px-2.5 rounded-lg transition-colors hover:border-[var(--accent-line)]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}
            aria-label="Set rest timer duration"
          >
            <Timer className="w-3 h-3 text-[var(--text-faint)]" />
            <span className="mono text-[10px] text-[var(--text-mid)] tabular-nums">{restLabel}</span>
          </button>

          {/* Plate calculator */}
          <button
            onClick={() => onOpenPlateCalc(workingWeight || 100)}
            className="p-2 rounded-lg text-[var(--text-low)] hover:text-[var(--text-hi)] hover:bg-white/[0.06] transition-colors"
            aria-label="Plate calculator"
          >
            <Calculator className="w-4 h-4" />
          </button>

          {/* Exercise menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-2 rounded-lg text-[var(--text-low)] hover:text-[var(--text-hi)] hover:bg-white/[0.06] transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-1 w-48 z-20 rounded-[var(--radius-inner)] overflow-hidden"
                  style={{
                    background: 'rgba(10,13,24,0.97)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid var(--glass-border-strong)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  }}
                >
                  {[
                    { label: 'Replace Exercise', action: () => { onReplaceExercise?.(); setMenuOpen(false) } },
                    { label: 'Move Up',          action: () => { moveExerciseUp(exerciseIndex); setMenuOpen(false) } },
                    { label: 'Move Down',        action: () => { moveExerciseDown(exerciseIndex); setMenuOpen(false) } },
                    ...(onSupersetWith && supersetCandidates && supersetCandidates.length > 0
                      ? [{ label: 'Superset with…', action: () => { setMenuOpen(false); setShowSupersetPicker(true) } }]
                      : []),
                    ...(onUnpairSuperset ? [{ label: 'Remove from Superset', action: () => { onUnpairSuperset(); setMenuOpen(false) } }] : []),
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full text-left px-4 py-3 text-[13px] text-[var(--text-hi)] hover:bg-white/[0.06] transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                  <div className="h-px bg-[var(--glass-border)]" />
                  <button
                    onClick={async () => {
                      setMenuOpen(false)
                      const confirmed = await dialog.confirm({
                        title: 'Remove Exercise', description: 'Remove this exercise from the workout?',
                        danger: true, confirmText: 'Remove',
                      })
                      if (confirmed) removeExercise(exerciseIndex)
                    }}
                    className="w-full text-left px-4 py-3 text-[13px] transition-colors hover:bg-[var(--rose)]/10"
                    style={{ color: 'var(--rose)' }}
                  >
                    Remove Exercise
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Warmup ramp ─────────────────────────────────────────────────── */}
      <WarmupRamp
        workingWeight={workingWeight}
        onAddSet={(w, r) => addWarmupSet(exerciseIndex, w, r)}
      />

      {/* ── Column headers ──────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 py-2"
        style={{ borderBottom: '1px solid var(--glass-border)' }}
      >
        <span className="w-14 text-center text-[9px] font-medium text-[var(--text-faint)] uppercase tracking-widest">Set · Prev</span>
        <span className="flex-1 text-center text-[9px] font-medium text-[var(--text-faint)] uppercase tracking-widest">kg</span>
        <span className="flex-1 text-center text-[9px] font-medium text-[var(--text-faint)] uppercase tracking-widest">Reps</span>
        <span className="w-10 text-center text-[9px] font-medium text-[var(--text-faint)] uppercase tracking-widest">
          <Check className="w-3 h-3 mx-auto" />
        </span>
      </div>

      {/* ── Set rows ────────────────────────────────────────────────────── */}
      <div className="px-4 py-3">
        {exercise.sets.map((set, setIndex) => {
          const workingSetsBefore = exercise.sets.slice(0, setIndex).filter(s => !s.is_warmup).length
          const lastSetAtPosition = !set.is_warmup ? lastWorkoutSets[workingSetsBefore] : undefined
          const prevText = lastSetAtPosition ? `${lastSetAtPosition.weight_kg}×${lastSetAtPosition.reps}` : '-'

          return (
            <SetRow
              key={set.id}
              set={set}
              setIndex={setIndex}
              isBodyweight={isBodyweight}
              prevSetText={prevText}
              suggestion={lastSetAtPosition?.suggestion}
              defaultRpe={dupRpeTarget}
              onChange={updates => updateSet(exerciseIndex, setIndex, updates)}
              onDone={() => {
                const currentSet = exercise.sets[setIndex]
                const wasCompleted = currentSet.completed
                markSetDone(exerciseIndex, setIndex)
                if (!wasCompleted) {
                  handleSetCompleted()
                  if (!currentSet.is_warmup && currentSet.weight_kg > 0 && currentSet.reps > 0) {
                    const prs = checkLocalPR(exercise.exercise.id, currentSet.weight_kg, currentSet.reps)
                    if (prs.length > 0) setActivePRs(prs)
                  }
                }
              }}
              onRemove={() => removeSet(exerciseIndex, setIndex)}
              onRestore={(restoredSet, position) => insertSet(exerciseIndex, position, restoredSet)}
            />
          )
        })}

        {/* ── Add set buttons ─────────────────────────────────────────── */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => addWarmupSet(exerciseIndex)}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 text-[11px] font-medium uppercase tracking-widest rounded-[var(--radius-inner)] transition-colors border border-orange-500/20 bg-orange-500/5 text-orange-400 hover:bg-orange-500/10"
          >
            <Plus className="w-3 h-3" /> Warmup
          </button>
          <button
            onClick={() => addSet(exerciseIndex)}
            className="flex-1 flex items-center justify-center gap-1.5 h-9 text-[11px] font-medium uppercase tracking-widest rounded-[var(--radius-inner)] transition-colors"
            style={{
              background: 'var(--accent-soft)',
              border: '1px solid var(--accent-line)',
              color: 'var(--accent)',
            }}
          >
            <Plus className="w-3 h-3" /> Add Set
          </button>
        </div>

        {/* ── Rep bank progress (rep-sum mode) ────────────────────────── */}
        {isRepSum && repSumTarget > 0 && (
          <div
            className="mt-3 pt-2.5"
            style={{ borderTop: '1px solid var(--glass-border)' }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-medium text-[var(--text-faint)] uppercase tracking-widest">Rep bank</span>
              <span className="mono text-xs tabular-nums" style={{ color: sessionRepsLogged >= repSumTarget ? 'var(--accent)' : 'var(--text-mid)' }}>
                {sessionRepsLogged}
                <span className="text-[9px] text-[var(--text-faint)]">/{repSumTarget}</span>
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (sessionRepsLogged / repSumTarget) * 100)}%`,
                  background: sessionRepsLogged >= repSumTarget ? 'var(--accent)' : 'var(--accent-line)',
                }}
              />
            </div>
          </div>
        )}

        {/* ── Session volume ──────────────────────────────────────────── */}
        {sessionVolume > 0 && !isRepSum && (
          <div
            className="flex items-center justify-between mt-3 pt-2.5"
            style={{ borderTop: '1px solid var(--glass-border)' }}
          >
            <span className="text-[9px] font-medium text-[var(--text-faint)] uppercase tracking-widest">Session volume</span>
            <span className="mono text-xs text-[var(--text-mid)] tabular-nums">
              {sessionVolume >= 1000 ? `${(sessionVolume / 1000).toFixed(1)}k` : sessionVolume}
              <span className="text-[9px] text-[var(--text-faint)] ml-0.5">kg</span>
            </span>
          </div>
        )}
      </div>

      {/* ── Rest duration picker ─────────────────────────────────────────── */}
      <RestDurationPicker
        isOpen={showDurationPicker}
        current={restSeconds}
        onChange={handleRestSecondsChange}
        onClose={() => setShowDurationPicker(false)}
      />

      {/* ── Superset picker ──────────────────────────────────────────────── */}
      <BottomSheet
        isOpen={showSupersetPicker}
        onClose={() => setShowSupersetPicker(false)}
        title="Superset with…"
      >
        <div className="space-y-2">
          {(supersetCandidates ?? []).map(candidate => (
            <button
              key={candidate.index}
              onClick={() => { onSupersetWith?.(candidate.index); setShowSupersetPicker(false) }}
              className="w-full text-left px-4 py-3 rounded-[var(--radius-inner)] text-[13px] text-[var(--text-hi)] hover:bg-white/[0.06] transition-colors"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}
            >
              {candidate.name}
            </button>
          ))}
        </div>
      </BottomSheet>

      {/* ── PR celebration ──────────────────────────────────────────────── */}
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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Rest Duration" icon={<Timer className="w-4 h-4 text-[var(--accent)]" />}>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {REST_PRESETS.map(p => (
          <button
            key={p.seconds}
            onClick={() => onChange(p.seconds)}
            className={cn(
              'py-3 rounded-[var(--radius-inner)] mono text-sm transition-all active:scale-95',
              current === p.seconds
                ? 'text-[var(--accent-on)]'
                : 'text-[var(--text-mid)] hover:text-[var(--text-hi)]',
            )}
            style={current === p.seconds
              ? { background: 'var(--accent)', border: '1px solid var(--accent)' }
              : { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }
            }
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          inputMode="numeric"
          placeholder="Custom (seconds)"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
          className="flex-1 h-11 rounded-[var(--radius-inner)] px-4 mono text-sm text-[var(--text-hi)] placeholder:text-[var(--text-faint)] focus:outline-none"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}
        />
        <button
          onClick={handleCustomSubmit}
          className="h-11 px-5 rounded-[var(--radius-inner)] mono text-sm transition-transform active:scale-95"
          style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}
        >
          Set
        </button>
      </div>
      <p className="text-[10px] text-[var(--text-faint)] mt-2">
        Saved per exercise — pre-fills next time.
      </p>
    </BottomSheet>
  )
}

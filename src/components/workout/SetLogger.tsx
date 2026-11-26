'use client'

import { SetRow }               from './SetRow'
import { WarmupRamp }           from './WarmupRamp'
import { PRBanner }             from './PRBanner'
import type { ActiveExercise, PRCheckResult } from '@/types/database'
import { Plus, MoreVertical, Calculator, Timer } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button, IconButton, Input } from '@/components/ui'
import { ExerciseTallyRow } from './ExerciseTallyRow'
import { SetTableHeader } from './SetTableHeader'
import { exerciseTally } from '@/lib/workout-session'
import type { ReactNode } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useWorkoutStore }      from '@/store/workout.store'
import { usePRStore }           from '@/store/pr.store'
import { useLastWorkoutSets }   from '@/hooks/useLastWorkoutSets'
import { useDialog }            from '@/providers/DialogProvider'
import { getCurrentUserId, getSupabaseClient }    from '@/lib/supabase/client'
import { upsertExercisePreference } from '@/lib/data/exercise-preferences'
import { useTrainingCycle } from '@/hooks/useTrainingCycle'

// RPE pre-fill before the training cycle has loaded.
const DEFAULT_RPE_TARGET = 8
import { cn } from '@/lib/utils'
import { formatVolume, setVolume, isAssisted, formatAddedWeight } from '@/lib/load'

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
  onRestTimerStart: (restSeconds: number, exerciseIndex: number) => void
  isCollapsed?: boolean
  onExpand?:    () => void
  // Superset controls — provided by the parent workout page
  onSupersetWith?:   (otherIndex: number) => void
  supersetCandidates?: SupersetCandidate[]
  onUnpairSuperset?:   () => void
  /** The drag handle, when the list is reorderable. */
  dragHandle?: ReactNode
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
  dragHandle = null,
}: SetLoggerProps) {
  const { updateSet, markSetDone, addSet, addWarmupSet, removeExercise, removeSet, insertSet, updateExerciseRestSeconds } = useWorkoutStore()

  const isBodyweight = exercise.exercise.equipment?.toLowerCase() === 'bodyweight' &&
    !exercise.exercise.name.toLowerCase().includes('weighted')
  const isWeightedBodyweight = exercise.exercise.equipment?.toLowerCase() === 'bodyweight' &&
    !!exercise.exercise.name.toLowerCase().match(/weighted/i)
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
    isAssisted(exercise.exercise.name),
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
      const userId = await getCurrentUserId()
      if (!userId || cancelled) return

      const { data } = await supabase
        .from('user_exercise_preferences')
        .select('rest_seconds')
        .eq('user_id', userId)
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
    onRestTimerStart(restSeconds, exerciseIndex)
  }, [restSeconds, onRestTimerStart, exerciseIndex])

  const { cycle }     = useTrainingCycle()
  const dupRpeTarget  = cycle?.scheme.rpeTarget ?? DEFAULT_RPE_TARGET
  const workingWeight = exercise.sets.find(s => !s.is_warmup && s.weight_kg > 0)?.weight_kg ?? 0

  const userBodyweight = useWorkoutStore(s => s.userBodyweight) ?? 75
  const sessionVolume = exercise.sets
    .filter(s => s.completed && !s.is_warmup && s.weight_kg > 0 && s.reps > 0)
    .reduce((sum, s) => sum + setVolume(s.weight_kg, s.reps, exercise.exercise.name, userBodyweight), 0)

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
    return (
      <div className="mb-2.5">
        <ExerciseTallyRow
          name={exercise.exercise.name}
          muscle={exercise.exercise.muscle_group}
          tally={exerciseTally(exercise)}
          onOpen={() => onExpand?.()}
          handle={dragHandle}
        />
      </div>
    )
  }

  return (
    <div className="mb-2.5 overflow-hidden rounded-card border border-border-strong bg-surface">

      {/* ── Exercise header ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 py-2 pr-2">
        {dragHandle ?? <span className="w-4" aria-hidden="true" />}
        <div className="min-w-0 flex-1">
          <h3 className="t-title-3 break-words">{exercise.exercise.name}</h3>
          <p className="t-caption capitalize">{exercise.exercise.muscle_group}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">

          {/* Exercise menu */}
          <div className="relative">
            <IconButton aria-label={`More for ${exercise.exercise.name}`} onClick={() => setMenuOpen(o => !o)}>
              <MoreVertical className="w-5 h-5" aria-hidden="true" />
            </IconButton>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-1 w-48 z-20 rounded-control overflow-hidden bg-surface-raised border border-border-strong shadow-[var(--shadow-overlay)]"
                >
                  {[
                    { label: 'Replace exercise', action: () => { onReplaceExercise?.(); setMenuOpen(false) } },
                    ...(onSupersetWith && supersetCandidates && supersetCandidates.length > 0
                      ? [{ label: 'Superset with…', action: () => { setMenuOpen(false); setShowSupersetPicker(true) } }]
                      : []),
                    ...(onUnpairSuperset ? [{ label: 'Remove from superset', action: () => { onUnpairSuperset(); setMenuOpen(false) } }] : []),
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full text-left px-4 py-3 text-sm text-primary hover:bg-surface transition-colors"
                    >
                      {item.label}
                    </button>
                  ))}
                  <div className="h-px bg-border" />
                  <button
                    onClick={async () => {
                      setMenuOpen(false)
                      const confirmed = await dialog.confirm({
                        title: 'Remove exercise', description: 'Remove this exercise from the workout?',
                        danger: true, confirmText: 'Remove',
                      })
                      if (confirmed) removeExercise(exerciseIndex)
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-negative transition-colors hover:bg-negative-soft"
                  >
                    Remove exercise
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

      {/* ── Tools ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 px-4 pb-3">
        <button
          type="button"
          onClick={() => setShowDurationPicker(true)}
          className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-border bg-surface-raised px-3.5 text-sm text-secondary"
          aria-label={`Rest time, ${restLabel}`}
        >
          <Timer className="h-4 w-4" aria-hidden="true" />
          <span className="mono">{restLabel}</span>
        </button>
        <button
          type="button"
          onClick={() => onOpenPlateCalc(workingWeight || 100)}
          className="focus-ring inline-flex min-h-11 items-center gap-1.5 rounded-pill border border-border bg-surface-raised px-3.5 text-sm text-secondary"
        >
          <Calculator className="h-4 w-4" aria-hidden="true" />
          Plates
        </button>
      </div>

      {/* ── Set rows ────────────────────────────────────────────────────── */}
      <div className="px-4 pb-3">
        <SetTableHeader />
        {exercise.sets.map((set, setIndex) => {
          const workingSetsBefore = exercise.sets.slice(0, setIndex).filter(s => !s.is_warmup).length
          const lastSetAtPosition = !set.is_warmup ? lastWorkoutSets[workingSetsBefore] : undefined
          
          let prevText = '-'
          if (lastSetAtPosition) {
            if (isBodyweight) {
              prevText = `BW×${lastSetAtPosition.reps}`
            } else if (isWeightedBodyweight) {
              prevText = `${formatAddedWeight(lastSetAtPosition.weight_kg, lastSetAtPosition.bodyweight_kg)}×${lastSetAtPosition.reps}`
            } else {
              prevText = `${lastSetAtPosition.weight_kg}×${lastSetAtPosition.reps}`
            }
          }

          return (
            <SetRow
              key={set.id}
              set={set}
              setIndex={setIndex}
              isBodyweight={isBodyweight}
              isWeightedBodyweight={isWeightedBodyweight}
              isAssisted={isAssisted(exercise.exercise.name)}
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
                    const prs = checkLocalPR(exercise.exercise.id, exercise.exercise.name, currentSet.weight_kg, currentSet.reps)
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
            className="flex-1 flex items-center justify-center gap-1.5 min-h-11 text-sm font-medium rounded-pill transition-colors bg-caution-soft text-caution"
          >
            <Plus className="w-3 h-3" /> Warmup
          </button>
          <button
            onClick={() => addSet(exerciseIndex)}
            className="flex-1 flex items-center justify-center gap-1.5 min-h-11 text-sm font-medium rounded-pill transition-colors bg-surface-raised border border-border-strong text-primary"
          >
            <Plus className="w-3 h-3" /> Add set
          </button>
        </div>

        {/* ── Rep bank progress (rep-sum mode) ────────────────────────── */}
        {isRepSum && repSumTarget > 0 && (
          <div className="mt-3 pt-2.5 border-t border-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-tertiary">Rep bank</span>
              <span className={cn('mono text-xs tabular-nums', sessionRepsLogged >= repSumTarget ? 'text-positive' : 'text-secondary')}>
                {sessionRepsLogged}
                <span className="text-xs text-tertiary">/{repSumTarget}</span>
              </span>
            </div>
            <div className="h-1 rounded-full overflow-hidden bg-surface-raised">
              <div
                className={cn('h-full rounded-full transition-all duration-300', sessionRepsLogged >= repSumTarget ? 'bg-positive' : 'bg-secondary')}
                style={{ width: `${Math.min(100, (sessionRepsLogged / repSumTarget) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* ── Session volume ──────────────────────────────────────────── */}
        {sessionVolume > 0 && !isRepSum && (
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border">
            <span className="text-xs font-medium text-tertiary">Session volume</span>
            <span className="mono text-xs text-secondary tabular-nums">
              {formatVolume(sessionVolume)}
              <span className="text-xs text-tertiary ml-0.5">kg</span>
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
              className="w-full text-left px-4 py-3 rounded-control text-sm text-primary bg-surface border border-border hover:bg-surface-raised transition-colors"
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
          isWeighted={isWeightedBodyweight}
          isAssisted={isAssisted(exercise.exercise.name)}
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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Rest duration" icon={<Timer className="w-4 h-4 text-secondary" />}>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {REST_PRESETS.map(p => (
          <button
            key={p.seconds}
            onClick={() => onChange(p.seconds)}
            className={cn(
              'min-h-12 rounded-control mono text-sm border transition-all active:scale-95',
              current === p.seconds
                ? 'bg-primary border-border-strong text-bg'
                : 'bg-surface-raised border-border text-secondary hover:text-primary',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          type="number"
          inputMode="numeric"
          placeholder="Custom (seconds)"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
          className="flex-1 mono text-base"
        />
        <Button onClick={handleCustomSubmit} fullWidth={false}>
          Set
        </Button>
      </div>
      <p className="text-xs text-tertiary mt-2">
        Saved per exercise — pre-fills next time.
      </p>
    </BottomSheet>
  )
}

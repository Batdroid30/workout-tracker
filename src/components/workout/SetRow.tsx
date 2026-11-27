'use client'

import { useRef, useState, useCallback, useEffect, memo } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import type { ActiveSet } from '@/types/database'
import { rpeToRIR, calculate1RM } from '@/lib/algorithms'
import type { SetSuggestion } from '@/lib/suggestions/types'
import { cn } from '@/lib/utils'
import { useToast } from '@/providers/ToastProvider'
import { useWorkoutStore } from '@/store/workout.store'
import { formatWeightedSet } from '@/lib/load'
import { SET_GRID } from './SetTableHeader'
import { SuggestionChip } from './SuggestionChip'
import { RepsLeftPrompt } from './RepsLeftPrompt'

/** The plan's numbers for this set, saved with it so later sessions can measure how often plans were hit. */
export function suggestionFields(suggestion: SetSuggestion | undefined): Pick<ActiveSet, 'suggested_weight_kg' | 'suggested_reps'> {
  return {
    suggested_weight_kg: suggestion?.weightKg ?? null,
    suggested_reps: suggestion?.reps ?? null,
  }
}

interface SetRowProps {
  set: ActiveSet
  prevSetText?: string
  suggestion?: SetSuggestion
  /** Why the plan looks the way it does — passed to one set per exercise. */
  reason?: string
  /** Opens the plan explanation; the chip is not tappable without it. */
  onExplain?: () => void
  /** True for the exercise's key set — once completed without an RPE, it asks for reps left. */
  promptRepsLeft?: boolean
  /** DUP week RPE target — the RPE placeholder when there is no suggestion (first-time exercises). */
  defaultRpe?: number
  /** True for pure bodyweight exercises (pull-ups, dips, push-ups). Hides the weight input. */
  isBodyweight?: boolean
  isWeightedBodyweight?: boolean
  /** True for assisted exercises — weight_kg is assistance, so lower is better. */
  isAssisted?: boolean
  onChange: (updates: Partial<ActiveSet>) => void
  onDone: () => void
  /** Called immediately when the set is deleted. Receives the deleted set and its original index for undo. */
  onRemove: () => void
  /** Restores a previously removed set at the given position — used by the undo action. */
  onRestore?: (set: ActiveSet, position: number) => void
  /** The position (index) of this set in the exercise — needed to restore it on undo. */
  setIndex?: number
}

const NO_RPE: Partial<ActiveSet> = { rpe: null, rpe_source: null }

// ─── Active set ───────────────────────────────────────────────────────────────
// memo: every keystroke in any set's weight/reps input replaces the Zustand
// exercises array reference — memo prevents sibling rows re-rendering on each char.
const ActiveSetRow = memo(function ActiveSetRow({ set, prevSetText, suggestion, reason, onExplain, defaultRpe, isBodyweight, isWeightedBodyweight, isAssisted, onChange, onDone, onRemove, onRestore, setIndex }: SetRowProps) {
  const userBodyweight   = useWorkoutStore(s => s.userBodyweight) ?? 75
  const bodyweightLogged = useWorkoutStore(s => s.bodyweightLogged)
  
  const getDisplayWeight = useCallback((dbWeight: number) => {
    if (isWeightedBodyweight && dbWeight > 0) {
      return Math.max(0, Math.round((dbWeight - userBodyweight) * 10) / 10)
    }
    return dbWeight
  }, [isWeightedBodyweight, userBodyweight])

  const [weightStr, setWeightStr] = useState(() => set.weight_kg > 0 ? String(getDisplayWeight(set.weight_kg)) : '')
  const [rpeStr,    setRpeStr]    = useState(() => set.rpe !== null ? String(set.rpe) : '')
  const weightFocused = useRef(false)
  const rpeFocused    = useRef(false)

  // Enforce bodyweight in DB for pure bodyweight exercises
  useEffect(() => {
    if (isBodyweight && set.weight_kg !== userBodyweight) {
      onChange({ weight_kg: userBodyweight })
    }
  }, [isBodyweight, set.weight_kg, userBodyweight, onChange])

  useEffect(() => {
    if (!weightFocused.current) setWeightStr(set.weight_kg > 0 ? String(getDisplayWeight(set.weight_kg)) : '')
  }, [set.weight_kg, getDisplayWeight])

  useEffect(() => {
    if (!rpeFocused.current) setRpeStr(set.rpe !== null ? String(set.rpe) : '')
  }, [set.rpe])

  // Undo-delete: animate out for 300ms, then remove from store.
  // The 300ms window means finish-validation almost never sees a pending set.
  // Undo re-inserts via onRestore if the store removal already fired.
  const [removing, setRemoving] = useState(false)
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const removedFromStoreRef = useRef(false)
  const toast = useToast()

  const handleRemove = useCallback(() => {
    setRemoving(true)
    removedFromStoreRef.current = false
    const removedSet = set
    const removedIndex = setIndex ?? 0
    removeTimerRef.current = setTimeout(() => {
      removedFromStoreRef.current = true
      onRemove()
    }, 300)
    toast.info('Set removed', {
      duration: 4000,
      action: { label: 'Undo', onClick: () => {
        if (removeTimerRef.current) clearTimeout(removeTimerRef.current)
        if (removedFromStoreRef.current) {
          onRestore?.(removedSet, removedIndex)
        } else {
          setRemoving(false)
        }
      }},
    })
  }, [set, setIndex, onRemove, onRestore, toast])

  useEffect(() => () => { if (removeTimerRef.current) clearTimeout(removeTimerRef.current) }, [])

  // Amber flash on done
  const [ticked, setTicked] = useState(false)
  const handleDone = useCallback(() => {
    setTicked(true)
    setTimeout(() => { setTicked(false); onDone() }, 180)
  }, [onDone])

  const handleUseSuggestion = useCallback(() => {
    if (!suggestion) return
    const clampedWeight = isWeightedBodyweight ? Math.max(userBodyweight, suggestion.weightKg) : suggestion.weightKg
    if (!isBodyweight) setWeightStr(String(isWeightedBodyweight ? clampedWeight - userBodyweight : clampedWeight))
    onChange({ weight_kg: isBodyweight ? 0 : clampedWeight, reps: suggestion.reps })
  }, [suggestion, isBodyweight, isWeightedBodyweight, userBodyweight, onChange])

  const rpeTarget = suggestion?.rpeTarget ?? defaultRpe
  const rpePlaceholder = rpeTarget !== undefined ? String(rpeTarget) : 'RPE'

  const inputBase = cn(
    'flex-1 min-w-0 min-h-11 rounded-control text-center t-value bg-surface-raised border border-border',
    'placeholder:text-tertiary placeholder:text-sm focus:outline-none focus:border-border-strong transition-colors',
  )

  return (
    <div className={cn(
      'overflow-hidden transition-all duration-300',
      removing ? 'max-h-0 opacity-0 mb-0' : 'max-h-64 opacity-100 mb-1.5',
    )}>

      {/* Row 1: set · last time · weight · reps · ✓ (columns match SetTableHeader) */}
      <div className={cn(SET_GRID, 'py-1.5')}>
        <span className={cn(
          'mono text-sm w-7 h-7 flex items-center justify-center rounded-field',
          set.is_warmup
            ? 'bg-caution-soft text-caution'
            : 'bg-surface-raised text-secondary',
        )}>
          {set.is_warmup ? 'W' : set.set_number}
        </span>
        <span data-col="last" className="mono truncate text-sm text-tertiary">{prevSetText}</span>

        {/* Weight — hidden for pure bodyweight exercises */}
        {isBodyweight ? (
          <div className="flex-1 min-w-0 min-h-11 rounded-control flex items-center justify-center text-xs font-semibold text-tertiary bg-surface-raised border border-border">
            BW
          </div>
        ) : (
          <input
            type="text"
            inputMode="decimal"
            value={weightStr}
            placeholder={isWeightedBodyweight ? 'Added kg' : '0'}
            className={inputBase}
            onFocus={() => { weightFocused.current = true }}
            onChange={e => {
              const str = e.target.value
              setWeightStr(str)
              if (str === '' || str === '.') { onChange({ weight_kg: isWeightedBodyweight ? userBodyweight : 0 }); return }
              const v = parseFloat(str)
              if (!isNaN(v) && !str.endsWith('.')) {
                onChange({ weight_kg: isWeightedBodyweight ? userBodyweight + v : v })
              }
            }}
            onBlur={e => {
              weightFocused.current = false
              const v = parseFloat(e.target.value)
              const safe = isNaN(v) ? 0 : v
              onChange({ weight_kg: isWeightedBodyweight ? userBodyweight + safe : safe })
              setWeightStr(safe > 0 ? String(safe) : '')
            }}
          />
        )}

        {/* Reps */}
        <input
          type="text"
          inputMode="numeric"
          value={set.reps > 0 ? String(set.reps) : ''}
          placeholder="0"
          className={inputBase}
          onChange={e => {
            const v = parseInt(e.target.value, 10)
            onChange({ reps: isNaN(v) ? 0 : v })
          }}
        />

        {/* Done */}
        <button
          onClick={handleDone}
          aria-label="Complete set"
          className={cn(
            'w-11 h-11 shrink-0 rounded-control flex items-center justify-center border transition-all duration-150 active:scale-95',
            ticked
              ? 'bg-accent border-accent text-on-accent scale-110'
              : 'bg-surface-raised border-border text-tertiary',
          )}
        >
          <Check className="w-4 h-4" />
        </button>
      </div>

      {isWeightedBodyweight && (
        <p className="mono text-xs pb-1 pl-[104px] tabular-nums text-tertiary">
          BW {userBodyweight} + {getDisplayWeight(set.weight_kg)} = {Math.round(Math.max(set.weight_kg, userBodyweight) * 10) / 10} kg
          {bodyweightLogged === false && <span> · using 75 kg — log your bodyweight in Progress</span>}
        </p>
      )}

      {isAssisted && set.weight_kg >= userBodyweight && (
        <p className="text-xs pb-1 pl-[104px] text-caution">
          Assistance is at or above your bodyweight ({userBodyweight} kg) — check the number.
        </p>
      )}

      {suggestion && !set.is_warmup && (
        <SuggestionChip
          suggestion={suggestion}
          reason={reason}
          isBodyweight={isBodyweight}
          isWeightedBodyweight={isWeightedBodyweight}
          userBodyweight={userBodyweight}
          onUse={handleUseSuggestion}
          onExplain={onExplain}
        />
      )}

      {/* Row 2: RPE + delete */}
      {!set.is_warmup && (
        <div className="flex items-center gap-2 pb-1.5">
          <input
            type="text"
            inputMode="decimal"
            value={rpeStr}
            placeholder={rpePlaceholder}
            aria-label="RPE"
            className="flex-1 min-h-11 rounded-control text-center mono text-base text-secondary placeholder:text-sm placeholder:text-tertiary bg-surface-raised border border-border focus:outline-none focus:border-border-strong transition-colors"
            onFocus={() => { rpeFocused.current = true }}
            onChange={e => {
              const str = e.target.value
              setRpeStr(str)
              if (str === '') { onChange(NO_RPE); return }
              const v = parseFloat(str)
              if (!isNaN(v) && !str.endsWith('.') && v >= 1 && v <= 10) onChange({ rpe: v, rpe_source: 'entered' })
            }}
            onBlur={e => {
              rpeFocused.current = false
              const str = e.target.value
              const v = parseFloat(str)
              const isValid = !isNaN(v) && v >= 1 && v <= 10
              const committed = isValid ? v : null
              setRpeStr(committed === null ? '' : String(committed))
              // Focusing and leaving must not relabel an RPE the user did not change.
              if (committed === set.rpe) return
              onChange(committed === null ? NO_RPE : { rpe: committed, rpe_source: 'entered' })
            }}
          />
          <button
            onClick={handleRemove}
            className="w-11 h-11 shrink-0 flex items-center justify-center rounded-control bg-surface-raised border border-border text-tertiary transition-colors hover:bg-negative-soft"
            aria-label="Remove set"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Warmup: delete only */}
      {set.is_warmup && (
        <div className="flex justify-end pb-1.5">
          <button
            onClick={handleRemove}
            className="w-11 h-11 flex items-center justify-center rounded-control bg-surface-raised border border-border text-tertiary transition-colors hover:bg-negative-soft"
            aria-label="Remove set"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
})

// ─── Completed set ────────────────────────────────────────────────────────────

interface CompletedSetRowProps {
  set: ActiveSet
  isBodyweight?: boolean
  isWeightedBodyweight?: boolean
  isAssisted?: boolean
  promptRepsLeft?: boolean
  onChange: (updates: Partial<ActiveSet>) => void
  onDone: () => void
  onRemove: () => void
  onRestore?: (set: ActiveSet, position: number) => void
  setIndex?: number
}

const CompletedSetRow = memo(function CompletedSetRow({ set, isBodyweight, isWeightedBodyweight, isAssisted, promptRepsLeft, onChange, onDone, onRemove, onRestore, setIndex }: CompletedSetRowProps) {
  const userBodyweight = useWorkoutStore(s => s.userBodyweight) ?? 75
  const e1rm = !set.is_warmup && !isAssisted && set.weight_kg > 0 && set.reps > 1
    ? Math.round(calculate1RM(set.weight_kg, set.reps))
    : null

  const [pendingDelete, setPendingDelete] = useState(false)
  const [isRepsLeftSkipped, setIsRepsLeftSkipped] = useState(false)
  const isAskingRepsLeft = promptRepsLeft && !set.is_warmup && set.rpe === null && !isRepsLeftSkipped
  const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const removedFromStoreRef = useRef(false)
  const toast = useToast()

  const handleRemove = useCallback(() => {
    setPendingDelete(true)
    removedFromStoreRef.current = false
    const removedSet = set
    const removedIndex = setIndex ?? 0
    removeTimerRef.current = setTimeout(() => {
      removedFromStoreRef.current = true
      onRemove()
    }, 300)
    toast.info('Set removed', {
      duration: 4000,
      action: { label: 'Undo', onClick: () => {
        if (removeTimerRef.current) clearTimeout(removeTimerRef.current)
        if (removedFromStoreRef.current) {
          onRestore?.(removedSet, removedIndex)
        } else {
          setPendingDelete(false)
        }
      }},
    })
  }, [set, setIndex, onRemove, onRestore, toast])

  useEffect(() => () => { if (removeTimerRef.current) clearTimeout(removeTimerRef.current) }, [])

  // Swipe-to-delete
  const [swipeOffset, setSwipeOffset] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX }
  const handleTouchMove  = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.touches[0].clientX - touchStartX.current
    if (delta < 0) setSwipeOffset(Math.max(delta, -64))
    else setSwipeOffset(0)
  }
  const handleTouchEnd = () => {
    if (swipeOffset <= -32) setSwipeOffset(-64)
    else setSwipeOffset(0)
    touchStartX.current = null
  }

  return (
    <div className={cn(
      'overflow-hidden transition-all duration-300',
      pendingDelete ? 'max-h-0 opacity-0' : 'max-h-48 opacity-100',
    )}>
      <div className="relative group overflow-hidden rounded-control mb-1">
        {/* Swipe delete bg */}
        <div className={cn('absolute inset-y-0 right-0 w-16 flex items-center justify-center rounded-r-control', swipeOffset < 0 ? 'bg-negative-soft' : 'bg-transparent')}>
          <button onClick={handleRemove} className="w-full h-full flex items-center justify-center text-negative">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Row */}
        <div
          className={cn(SET_GRID, 'relative py-1.5 bg-surface transition-transform duration-200')}
          style={{ transform: `translateX(${swipeOffset}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Set badge */}
          <span className={cn(
            'mono text-sm w-7 h-7 flex items-center justify-center rounded-field shrink-0',
            set.is_warmup ? 'bg-caution-soft text-caution' : 'bg-surface-raised text-tertiary',
          )}>
            {set.is_warmup ? 'W' : set.set_number}
          </span>

          {/* Summary (spans last time, kg and reps) */}
          <span className="col-span-3 flex min-w-0 items-center gap-1">
          <span className="min-w-0 flex-1 truncate t-value">
            {isBodyweight ? 'BW' : isWeightedBodyweight && set.weight_kg > 0 ? formatWeightedSet(Math.max(set.weight_kg, userBodyweight), userBodyweight) : set.weight_kg > 0 ? `${set.weight_kg}kg` : '—'}
            {' × '}
            {set.reps > 0 ? set.reps : '—'}
            {e1rm && <span className="text-xs text-tertiary ml-1.5">· ~{e1rm}kg</span>}
            {!set.is_warmup && set.rpe !== null && (
              <span className="text-xs text-tertiary ml-1.5">· RPE {set.rpe} ({rpeToRIR(set.rpe)} RIR)</span>
            )}
          </span>

          {/* Desktop delete */}
          <button
            onClick={handleRemove}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-tertiary opacity-0 group-hover:opacity-100 hover:bg-negative-soft transition-all"
            aria-label="Remove set"
          >
            <X className="w-3 h-3" />
          </button>
          </span>

          {/* Untick — the lime tick stays full size where it was tapped */}
          <button onClick={onDone} className="w-11 h-11 shrink-0 rounded-control flex items-center justify-center bg-accent text-on-accent active:scale-95 transition-transform" aria-label="Untick set">
            <Check className="w-4 h-4" strokeWidth={3} />
          </button>
        </div>
      </div>
      {isAskingRepsLeft && (
        <RepsLeftPrompt
          onPick={rpe => onChange({ rpe, rpe_source: 'prompt' })}
          onSkip={() => setIsRepsLeftSkipped(true)}
        />
      )}
    </div>
  )
})

// ─── Public export ────────────────────────────────────────────────────────────

export const SetRow = memo(function SetRow({ set, prevSetText = '-', suggestion, reason, onExplain, promptRepsLeft, defaultRpe, isBodyweight, isWeightedBodyweight, isAssisted, onChange, onDone, onRemove, onRestore, setIndex }: SetRowProps) {
  if (set.completed) {
    return <CompletedSetRow set={set} isBodyweight={isBodyweight} isWeightedBodyweight={isWeightedBodyweight} isAssisted={isAssisted} promptRepsLeft={promptRepsLeft} onChange={onChange} onDone={onDone} onRemove={onRemove} onRestore={onRestore} setIndex={setIndex} />
  }
  return <ActiveSetRow set={set} prevSetText={prevSetText} suggestion={suggestion} reason={reason} onExplain={onExplain} defaultRpe={defaultRpe} isBodyweight={isBodyweight} isWeightedBodyweight={isWeightedBodyweight} isAssisted={isAssisted} onChange={onChange} onDone={onDone} onRemove={onRemove} onRestore={onRestore} setIndex={setIndex} />
})

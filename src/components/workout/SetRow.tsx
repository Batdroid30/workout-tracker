'use client'

import { useRef, useState, useCallback, useEffect, memo } from 'react'
import { Check, Trash2, X, Zap } from 'lucide-react'
import type { ActiveSet } from '@/types/database'
import { rpeToRIR, calculate1RM } from '@/lib/algorithms'
import type { OverloadSuggestion } from '@/lib/algorithms'
import { cn } from '@/lib/utils'
import { useToast } from '@/providers/ToastProvider'
import { useWorkoutStore } from '@/store/workout.store'
import { formatAddedWeight, formatWeightedSet } from '@/lib/load'

interface SetRowProps {
  set: ActiveSet
  prevSetText?: string
  suggestion?: OverloadSuggestion
  /** DUP week RPE target — used as fallback when there is no suggestion (first-time exercises). */
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

// ─── Active set ───────────────────────────────────────────────────────────────
// memo: every keystroke in any set's weight/reps input replaces the Zustand
// exercises array reference — memo prevents sibling rows re-rendering on each char.
const ActiveSetRow = memo(function ActiveSetRow({ set, prevSetText, suggestion, defaultRpe, isBodyweight, isWeightedBodyweight, isAssisted, onChange, onDone, onRemove, onRestore, setIndex }: SetRowProps) {
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

  // Pre-fill RPE from the suggestion target (returning exercises) or the DUP
  // week target (first-time exercises). Commits to state so it's saved even if
  // the user never touches the input.
  useEffect(() => {
    if (set.rpe !== null || rpeFocused.current) return
    const target = suggestion?.rpe_target ?? defaultRpe
    if (!target) return
    setRpeStr(String(target))
    onChange({ rpe: target })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion?.rpe_target, defaultRpe])

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

  const inputBase = cn(
    'flex-1 min-w-0 min-h-11 rounded-control text-center t-value bg-surface-raised border border-border',
    'placeholder:text-tertiary placeholder:text-sm focus:outline-none focus:border-border-strong transition-colors',
  )

  return (
    <div className={cn(
      'overflow-hidden transition-all duration-300',
      removing ? 'max-h-0 opacity-0 mb-0' : 'max-h-64 opacity-100 mb-1.5',
    )}>

      {/* Row 1: [set# + prev] · weight · reps · ✓ */}
      <div className="flex items-center gap-2 py-1.5">
        {/* Set badge + prev */}
        <div className="w-14 shrink-0 flex flex-col items-center gap-0.5">
          <span className={cn(
            'mono text-xs w-6 h-6 flex items-center justify-center rounded',
            set.is_warmup
              ? 'bg-caution-soft text-caution'
              : 'bg-surface-raised text-secondary',
          )}>
            {set.is_warmup ? 'W' : set.set_number}
          </span>
          <span className="text-xs text-tertiary leading-none tabular-nums whitespace-nowrap">{prevSetText}</span>
        </div>

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
        <p className="mono text-xs pb-1 pl-16 tabular-nums text-tertiary">
          BW {userBodyweight} + {getDisplayWeight(set.weight_kg)} = {Math.round(Math.max(set.weight_kg, userBodyweight) * 10) / 10} kg
          {bodyweightLogged === false && <span> · using 75 kg — log your bodyweight in Progress</span>}
        </p>
      )}

      {isAssisted && set.weight_kg >= userBodyweight && (
        <p className="text-xs pb-1 pl-16 text-caution">
          Assistance is at or above your bodyweight ({userBodyweight} kg) — check the number.
        </p>
      )}

      {/* Suggestion chip */}
      {suggestion && !set.is_warmup && (
        <button
          onClick={() => {
            const clampedWeight = isWeightedBodyweight ? Math.max(userBodyweight, suggestion.weight_kg) : suggestion.weight_kg
            if (!isBodyweight) setWeightStr(isWeightedBodyweight ? String(clampedWeight >= userBodyweight ? clampedWeight - userBodyweight : 0) : String(clampedWeight))
            onChange({
              weight_kg: isBodyweight ? 0 : clampedWeight,
              reps: suggestion.target_reps,
            })
          }}
          className="w-full flex items-center gap-1.5 px-2 py-1 mb-1 rounded-control bg-surface-raised border border-border transition-all active:scale-[0.98] group"
        >
          <Zap className="w-3 h-3 shrink-0 text-secondary" />
          <span className="mono text-xs tabular-nums text-primary">
            {isBodyweight 
              ? `BW × ${suggestion.target_reps}` 
              : isWeightedBodyweight 
                ? `${formatAddedWeight(Math.max(suggestion.weight_kg, userBodyweight), userBodyweight)} × ${suggestion.target_reps}`
                : `${suggestion.weight_kg}kg × ${suggestion.target_reps}`}
          </span>
          <span className="mono text-xs tabular-nums text-secondary">
            · RPE {suggestion.rpe_target} ({rpeToRIR(suggestion.rpe_target)} RIR)
          </span>
          <span className="text-xs text-tertiary truncate flex-1 text-left">
            {suggestion.reason}
          </span>
        </button>
      )}

      {/* Row 2: RPE + delete */}
      {!set.is_warmup && (
        <div className="flex items-center gap-2 pb-1.5">
          <input
            type="text"
            inputMode="decimal"
            value={rpeStr}
            placeholder="RPE · 1–10"
            className="flex-1 min-h-11 rounded-control text-center mono text-sm text-secondary placeholder:text-tertiary placeholder:text-xs bg-surface-raised border border-border focus:outline-none focus:border-border-strong transition-colors"
            onFocus={() => { rpeFocused.current = true }}
            onChange={e => {
              const str = e.target.value
              setRpeStr(str)
              if (str === '') { onChange({ rpe: null }); return }
              const v = parseFloat(str)
              if (!isNaN(v) && !str.endsWith('.') && v >= 1 && v <= 10) onChange({ rpe: v })
            }}
            onBlur={e => {
              rpeFocused.current = false
              const str = e.target.value
              if (str === '') { onChange({ rpe: null }); setRpeStr(''); return }
              const v = parseFloat(str)
              if (isNaN(v) || v < 1 || v > 10) { onChange({ rpe: null }); setRpeStr('') }
              else { onChange({ rpe: v }); setRpeStr(String(v)) }
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
  onDone: () => void
  onRemove: () => void
  onRestore?: (set: ActiveSet, position: number) => void
  setIndex?: number
}

const CompletedSetRow = memo(function CompletedSetRow({ set, isBodyweight, isWeightedBodyweight, isAssisted, onDone, onRemove, onRestore, setIndex }: CompletedSetRowProps) {
  const userBodyweight = useWorkoutStore(s => s.userBodyweight) ?? 75
  const e1rm = !set.is_warmup && !isAssisted && set.weight_kg > 0 && set.reps > 1
    ? Math.round(calculate1RM(set.weight_kg, set.reps))
    : null

  const [pendingDelete, setPendingDelete] = useState(false)
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
      pendingDelete ? 'max-h-0 opacity-0' : 'max-h-32 opacity-100',
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
          className="relative flex items-center gap-2 py-2.5 bg-surface transition-transform duration-200"
          style={{ transform: `translateX(${swipeOffset}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Untick */}
          <button onClick={onDone} className="w-8 shrink-0 flex items-center justify-center active:scale-90 transition-transform" aria-label="Untick set">
            <div className="w-6 h-6 rounded flex items-center justify-center bg-accent">
              <Check className="w-3.5 h-3.5 text-on-accent" strokeWidth={3} />
            </div>
          </button>

          {/* Set badge */}
          <span className={cn(
            'mono text-xs w-5 h-5 flex items-center justify-center rounded shrink-0',
            set.is_warmup ? 'bg-caution-soft text-caution' : 'bg-surface-raised text-tertiary',
          )}>
            {set.is_warmup ? 'W' : set.set_number}
          </span>

          {/* Summary */}
          <span className="flex-1 min-w-0 t-value">
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
        </div>
      </div>
    </div>
  )
})

// ─── Public export ────────────────────────────────────────────────────────────

export const SetRow = memo(function SetRow({ set, prevSetText = '-', suggestion, defaultRpe, isBodyweight, isWeightedBodyweight, isAssisted, onChange, onDone, onRemove, onRestore, setIndex }: SetRowProps) {
  if (set.completed) {
    return <CompletedSetRow set={set} isBodyweight={isBodyweight} isWeightedBodyweight={isWeightedBodyweight} isAssisted={isAssisted} onDone={onDone} onRemove={onRemove} onRestore={onRestore} setIndex={setIndex} />
  }
  return <ActiveSetRow set={set} prevSetText={prevSetText} suggestion={suggestion} defaultRpe={defaultRpe} isBodyweight={isBodyweight} isWeightedBodyweight={isWeightedBodyweight} isAssisted={isAssisted} onChange={onChange} onDone={onDone} onRemove={onRemove} onRestore={onRestore} setIndex={setIndex} />
})

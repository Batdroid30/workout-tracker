'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Check, Trash2, X, Zap } from 'lucide-react'
import type { ActiveSet } from '@/types/database'
import type { OverloadSuggestion } from '@/lib/algorithms'
import { cn } from '@/lib/utils'
import { useToast } from '@/providers/ToastProvider'

interface SetRowProps {
  set: ActiveSet
  prevSetText?: string
  /** Per-set progressive-overload suggestion from the previous workout. */
  suggestion?: OverloadSuggestion
  onChange: (updates: Partial<ActiveSet>) => void
  onDone: () => void
  onRemove: () => void
}

// ─── Active set ───────────────────────────────────────────────────────────────
//
// Layout:
//   Row 1: [badge] [prev] [weight input] [reps input] [✓]
//   Row 2: [RPE input ·············] [trash]    ← non-warmup only
//          (warmup: just [trash] right-aligned)
//
// Decimal-safe: weight uses local string state so typing "27." doesn't
// get sanitised to "27" mid-entry. Value is committed to the store onBlur
// and whenever the string represents a complete valid number.

function ActiveSetRow({ set, prevSetText, suggestion, onChange, onDone, onRemove }: SetRowProps) {
  // ── Local string state for weight (fixes decimal mid-entry bug) ──────────
  const [weightStr, setWeightStr] = useState(() =>
    set.weight_kg > 0 ? String(set.weight_kg) : ''
  )
  const [rpeStr, setRpeStr] = useState(() =>
    set.rpe !== null ? String(set.rpe) : ''
  )
  const weightFocused = useRef(false)
  const rpeFocused    = useRef(false)

  // Sync from store when the input is not focused
  // (handles pre-fill from addSet / addWarmupSet)
  useEffect(() => {
    if (!weightFocused.current) {
      setWeightStr(set.weight_kg > 0 ? String(set.weight_kg) : '')
    }
  }, [set.weight_kg])

  useEffect(() => {
    if (!rpeFocused.current) {
      setRpeStr(set.rpe !== null ? String(set.rpe) : '')
    }
  }, [set.rpe])

  // ── Undo-delete pattern ──────────────────────────────────────────────────
  const [pendingDelete, setPendingDelete] = useState(false)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toast = useToast()

  const handleRemove = useCallback(() => {
    setPendingDelete(true)
    undoTimerRef.current = setTimeout(() => onRemove(), 4000)
    toast.info('Set removed', {
      duration: 4000,
      action: {
        label: 'Undo',
        onClick: () => {
          if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
          setPendingDelete(false)
        },
      },
    })
  }, [onRemove, toast])

  // Clear pending timer on unmount
  useEffect(() => () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
  }, [])

  // ── Done button with lime flash ──────────────────────────────────────────
  const [ticked, setTicked] = useState(false)
  const handleDone = useCallback(() => {
    setTicked(true)
    setTimeout(() => {
      setTicked(false)
      onDone()
    }, 180)
  }, [onDone])

  // ── Shared input style ───────────────────────────────────────────────────
  // min-w-0 overrides the browser default min-width:auto on flex items,
  // allowing inputs to shrink below their intrinsic size on narrow screens.
  const inputBase =
    'flex-1 min-w-0 h-10 bg-[#0c1324] border border-[#334155] rounded-lg text-center font-black text-base text-white placeholder:text-[#334155] focus:outline-none focus:border-[#CCFF00]/50 transition-colors'

  return (
    <div className={cn(
      'overflow-hidden transition-all duration-300',
      pendingDelete ? 'max-h-0 opacity-0 mb-0' : 'max-h-64 opacity-100 mb-1.5',
    )}>
      {/* ── Row 1: [set# + prev stacked] · weight · reps · ✓ ──────────── */}
      <div className="flex items-center gap-2 py-1.5">
        {/* Set badge + prev + suggestion — stacked in one column */}
        <div className="w-14 shrink-0 flex flex-col items-center gap-0.5">
          <span className={cn(
            'font-black text-xs w-6 h-6 flex items-center justify-center rounded',
            set.is_warmup
              ? 'bg-orange-500/10 text-orange-400'
              : 'bg-[#151b2d] text-[#adb4ce]',
          )}>
            {set.is_warmup ? 'W' : set.set_number}
          </span>
          {/* Previous performance */}
          <span className="text-[9px] font-body text-[#334155] leading-none tabular-nums">
            {prevSetText}
          </span>
        </div>

        {/* Weight — decimal-safe via local string state, min-w-0 allows flex shrink */}
        <input
          type="text"
          inputMode="decimal"
          value={weightStr}
          placeholder="0"
          className={inputBase}
          onFocus={() => { weightFocused.current = true }}
          onChange={e => {
            const str = e.target.value
            setWeightStr(str)
            // Don't commit while mid-decimal (e.g. "27.")
            if (str === '' || str === '.') { onChange({ weight_kg: 0 }); return }
            const v = parseFloat(str)
            if (!isNaN(v) && !str.endsWith('.')) onChange({ weight_kg: v })
          }}
          onBlur={e => {
            weightFocused.current = false
            const v = parseFloat(e.target.value)
            const safe = isNaN(v) ? 0 : v
            onChange({ weight_kg: safe })
            setWeightStr(safe > 0 ? String(safe) : '')
          }}
        />

        {/* Reps — integers only, min-w-0 allows flex shrink */}
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

        {/* Done — lime flash on tap */}
        <button
          onClick={handleDone}
          className={cn(
            'w-10 h-10 shrink-0 rounded-lg flex items-center justify-center border transition-all duration-150',
            ticked
              ? 'bg-[#CCFF00] border-[#CCFF00] text-[#020617] scale-110'
              : 'bg-[#151b2d] border-[#334155] text-[#334155] hover:border-[#CCFF00]/50 hover:text-[#CCFF00]/60 active:scale-95',
          )}
        >
          <Check className="w-4 h-4" />
        </button>
      </div>

      {/* ── Suggestion chip — tap to pre-fill weight + reps ────────────── */}
      {suggestion && !set.is_warmup && (
        <button
          onClick={() => {
            setWeightStr(String(suggestion.weight_kg))
            onChange({ weight_kg: suggestion.weight_kg, reps: suggestion.target_reps })
          }}
          className="w-full flex items-center gap-1.5 px-2 py-1 mb-1 rounded-lg border border-[#CCFF00]/20 bg-[#CCFF00]/5 hover:bg-[#CCFF00]/10 active:scale-[0.98] transition-all group"
        >
          <Zap className="w-3 h-3 text-[#CCFF00]/60 shrink-0 group-hover:text-[#CCFF00]" />
          <span className="text-[11px] font-black text-[#CCFF00]/60 group-hover:text-[#CCFF00] tabular-nums">
            {suggestion.weight_kg}kg × {suggestion.target_reps}
          </span>
          <span className="text-[10px] font-body text-[#4a5568] truncate flex-1 text-left">
            {suggestion.reason}
          </span>
        </button>
      )}

      {/* ── Row 2: RPE + delete (non-warmup) ────────────────────────────── */}
      {!set.is_warmup && (
        <div className="flex items-center gap-2 pb-1.5">
          <input
            type="text"
            inputMode="decimal"
            value={rpeStr}
            placeholder="RPE · 1–10"
            className="flex-1 h-9 bg-[#0c1324] border border-[#334155] rounded-lg text-center font-black text-sm text-[#adb4ce] placeholder:text-[#4a5568] placeholder:font-body placeholder:text-[11px] placeholder:tracking-wide focus:outline-none focus:border-[#CCFF00]/30 transition-colors"
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
              if (isNaN(v) || v < 1 || v > 10) {
                // Out of range — clear silently
                onChange({ rpe: null })
                setRpeStr('')
              } else {
                onChange({ rpe: v })
                setRpeStr(String(v))
              }
            }}
          />
          <button
            onClick={handleRemove}
            className="w-9 h-9 shrink-0 flex items-center justify-center bg-[#0c1324] border border-[#334155] rounded-lg text-[#4a5568] hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-colors"
            aria-label="Remove set"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Row 2: delete only (warmup) ─────────────────────────────────── */}
      {set.is_warmup && (
        <div className="flex justify-end pb-1.5">
          <button
            onClick={handleRemove}
            className="w-9 h-9 flex items-center justify-center bg-[#0c1324] border border-[#334155] rounded-lg text-[#4a5568] hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-colors"
            aria-label="Remove set"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Completed set ────────────────────────────────────────────────────────────

interface CompletedSetRowProps {
  set: ActiveSet
  onDone: () => void    // toggles back to active
  onRemove: () => void
}

function CompletedSetRow({ set, onDone, onRemove }: CompletedSetRowProps) {
  // Epley estimated 1RM — only meaningful for non-warmup, multi-rep working sets
  const e1rm = !set.is_warmup && set.weight_kg > 0 && set.reps > 1
    ? Math.round(set.weight_kg * (1 + set.reps / 30))
    : null
  // ── Undo-delete pattern ──────────────────────────────────────────────────
  const [pendingDelete, setPendingDelete] = useState(false)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toast = useToast()

  const handleRemove = useCallback(() => {
    setPendingDelete(true)
    undoTimerRef.current = setTimeout(() => onRemove(), 4000)
    toast.info('Set removed', {
      duration: 4000,
      action: {
        label: 'Undo',
        onClick: () => {
          if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
          setPendingDelete(false)
        },
      },
    })
  }, [onRemove, toast])

  useEffect(() => () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
  }, [])

  // Swipe-to-delete (touch only)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const touchStartX = useRef<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
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
    <div className="relative group overflow-hidden rounded-lg mb-1">
      {/* Swipe delete background */}
      <div className="absolute inset-y-0 right-0 w-16 bg-red-500/10 flex items-center justify-center rounded-r-lg">
        <button
          onClick={handleRemove}
          className="w-full h-full flex items-center justify-center text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Row content */}
      <div
        className="relative bg-[#070d1f] flex items-center gap-2 py-2.5 transition-transform duration-200"
        style={{ transform: `translateX(${swipeOffset}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Tap ✓ to untick */}
        <button
          onClick={onDone}
          className="w-8 shrink-0 flex items-center justify-center active:scale-90 transition-transform"
          aria-label="Untick set"
        >
          <div className="w-6 h-6 rounded bg-[#CCFF00] flex items-center justify-center">
            <Check className="w-3.5 h-3.5 text-[#020617]" strokeWidth={3} />
          </div>
        </button>

        {/* Set badge */}
        <span className={cn(
          'text-[11px] font-black w-5 h-5 flex items-center justify-center rounded shrink-0',
          set.is_warmup ? 'bg-orange-500/10 text-orange-400' : 'bg-[#151b2d] text-[#4a5568]',
        )}>
          {set.is_warmup ? 'W' : set.set_number}
        </span>

        {/* Summary */}
        <span className="flex-1 text-sm font-black text-[#4a5568] tracking-tight">
          {set.weight_kg > 0 ? `${set.weight_kg}kg` : '—'}
          {' × '}
          {set.reps > 0 ? set.reps : '—'}
          {e1rm && (
            <span className="text-[9px] font-body text-[#334155] ml-1.5">· ~{e1rm}kg</span>
          )}
          {!set.is_warmup && set.rpe !== null && (
            <span className="text-[10px] font-body text-[#334155] ml-1.5">· RPE {set.rpe}</span>
          )}
        </span>

        {/* Desktop-only delete — fades in on hover */}
        <button
          onClick={handleRemove}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#334155] opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/5 transition-all"
          aria-label="Remove set"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
    </div>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────

export function SetRow({ set, prevSetText = '-', suggestion, onChange, onDone, onRemove }: SetRowProps) {
  if (set.completed) {
    return (
      <CompletedSetRow
        set={set}
        onDone={onDone}
        onRemove={onRemove}
      />
    )
  }

  return (
    <ActiveSetRow
      set={set}
      prevSetText={prevSetText}
      suggestion={suggestion}
      onChange={onChange}
      onDone={onDone}
      onRemove={onRemove}
    />
  )
}

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
  suggestion?: OverloadSuggestion
  onChange: (updates: Partial<ActiveSet>) => void
  onDone: () => void
  onRemove: () => void
}

// ─── Active set ───────────────────────────────────────────────────────────────

function ActiveSetRow({ set, prevSetText, suggestion, onChange, onDone, onRemove }: SetRowProps) {
  const [weightStr, setWeightStr] = useState(() => set.weight_kg > 0 ? String(set.weight_kg) : '')
  const [rpeStr,    setRpeStr]    = useState(() => set.rpe !== null ? String(set.rpe) : '')
  const weightFocused = useRef(false)
  const rpeFocused    = useRef(false)

  useEffect(() => {
    if (!weightFocused.current) setWeightStr(set.weight_kg > 0 ? String(set.weight_kg) : '')
  }, [set.weight_kg])

  useEffect(() => {
    if (!rpeFocused.current) setRpeStr(set.rpe !== null ? String(set.rpe) : '')
  }, [set.rpe])

  // Undo-delete
  const [pendingDelete, setPendingDelete] = useState(false)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toast = useToast()

  const handleRemove = useCallback(() => {
    setPendingDelete(true)
    undoTimerRef.current = setTimeout(() => onRemove(), 4000)
    toast.info('Set removed', {
      duration: 4000,
      action: { label: 'Undo', onClick: () => {
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
        setPendingDelete(false)
      }},
    })
  }, [onRemove, toast])

  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }, [])

  // Amber flash on done
  const [ticked, setTicked] = useState(false)
  const handleDone = useCallback(() => {
    setTicked(true)
    setTimeout(() => { setTicked(false); onDone() }, 180)
  }, [onDone])

  const inputBase = cn(
    'flex-1 min-w-0 h-10 rounded-[var(--radius-inner)] text-center mono text-base text-[var(--text-hi)]',
    'placeholder:text-[var(--text-faint)] focus:outline-none transition-colors',
  )

  return (
    <div className={cn(
      'overflow-hidden transition-all duration-300',
      pendingDelete ? 'max-h-0 opacity-0 mb-0' : 'max-h-64 opacity-100 mb-1.5',
    )}>

      {/* Row 1: [set# + prev] · weight · reps · ✓ */}
      <div className="flex items-center gap-2 py-1.5">
        {/* Set badge + prev */}
        <div className="w-14 shrink-0 flex flex-col items-center gap-0.5">
          <span className={cn(
            'mono text-xs w-6 h-6 flex items-center justify-center rounded',
            set.is_warmup
              ? 'bg-orange-500/10 text-orange-400'
              : 'bg-white/[0.05] text-[var(--text-mid)]',
          )}>
            {set.is_warmup ? 'W' : set.set_number}
          </span>
          <span className="text-[9px] text-[var(--text-faint)] leading-none tabular-nums">{prevSetText}</span>
        </div>

        {/* Weight */}
        <input
          type="text"
          inputMode="decimal"
          value={weightStr}
          placeholder="0"
          className={inputBase}
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}
          onFocus={() => { weightFocused.current = true }}
          onChange={e => {
            const str = e.target.value
            setWeightStr(str)
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

        {/* Reps */}
        <input
          type="text"
          inputMode="numeric"
          value={set.reps > 0 ? String(set.reps) : ''}
          placeholder="0"
          className={inputBase}
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}
          onChange={e => {
            const v = parseInt(e.target.value, 10)
            onChange({ reps: isNaN(v) ? 0 : v })
          }}
        />

        {/* Done */}
        <button
          onClick={handleDone}
          className="w-10 h-10 shrink-0 rounded-[var(--radius-inner)] flex items-center justify-center border transition-all duration-150 active:scale-95"
          style={ticked
            ? { background: 'var(--accent)', borderColor: 'var(--accent)', transform: 'scale(1.1)' }
            : { background: 'rgba(255,255,255,0.04)', borderColor: 'var(--glass-border)', color: 'var(--text-faint)' }
          }
        >
          <Check className="w-4 h-4" style={ticked ? { color: 'var(--accent-on)' } : {}} />
        </button>
      </div>

      {/* Suggestion chip */}
      {suggestion && !set.is_warmup && (
        <button
          onClick={() => {
            setWeightStr(String(suggestion.weight_kg))
            onChange({ weight_kg: suggestion.weight_kg, reps: suggestion.target_reps })
          }}
          className="w-full flex items-center gap-1.5 px-2 py-1 mb-1 rounded-[var(--radius-inner)] transition-all active:scale-[0.98] group"
          style={{ border: '1px solid var(--accent-line)', background: 'var(--accent-soft)' }}
        >
          <Zap className="w-3 h-3 shrink-0" style={{ color: 'var(--accent)' }} />
          <span className="mono text-[11px] tabular-nums" style={{ color: 'var(--accent)' }}>
            {suggestion.weight_kg}kg × {suggestion.target_reps}
          </span>
          <span className="text-[10px] text-[var(--text-low)] truncate flex-1 text-left">
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
            className="flex-1 h-9 rounded-[var(--radius-inner)] text-center mono text-sm text-[var(--text-mid)] placeholder:text-[var(--text-faint)] placeholder:text-[11px] placeholder:tracking-wide focus:outline-none transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}
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
            className="w-9 h-9 shrink-0 flex items-center justify-center rounded-[var(--radius-inner)] transition-colors hover:bg-[var(--rose)]/10"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'var(--text-faint)' }}
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
            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-inner)] transition-colors hover:bg-[var(--rose)]/10"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'var(--text-faint)' }}
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
  onDone: () => void
  onRemove: () => void
}

function CompletedSetRow({ set, onDone, onRemove }: CompletedSetRowProps) {
  const e1rm = !set.is_warmup && set.weight_kg > 0 && set.reps > 1
    ? Math.round(set.weight_kg * (1 + set.reps / 30))
    : null

  const [pendingDelete, setPendingDelete] = useState(false)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toast = useToast()

  const handleRemove = useCallback(() => {
    setPendingDelete(true)
    undoTimerRef.current = setTimeout(() => onRemove(), 4000)
    toast.info('Set removed', {
      duration: 4000,
      action: { label: 'Undo', onClick: () => {
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
        setPendingDelete(false)
      }},
    })
  }, [onRemove, toast])

  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current) }, [])

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
      <div className="relative group overflow-hidden rounded-[var(--radius-inner)] mb-1">
        {/* Swipe delete bg */}
        <div className="absolute inset-y-0 right-0 w-16 flex items-center justify-center rounded-r-[var(--radius-inner)]"
          style={{ background: 'rgba(230,163,154,0.12)' }}>
          <button onClick={handleRemove} className="w-full h-full flex items-center justify-center" style={{ color: 'var(--rose)' }}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Row */}
        <div
          className="relative flex items-center gap-2 py-2.5 transition-transform duration-200"
          style={{ background: 'rgba(255,255,255,0.02)', transform: `translateX(${swipeOffset}px)` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Untick */}
          <button onClick={onDone} className="w-8 shrink-0 flex items-center justify-center active:scale-90 transition-transform" aria-label="Untick set">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: 'var(--accent)' }}>
              <Check className="w-3.5 h-3.5" style={{ color: 'var(--accent-on)' }} strokeWidth={3} />
            </div>
          </button>

          {/* Set badge */}
          <span className={cn(
            'mono text-[11px] w-5 h-5 flex items-center justify-center rounded shrink-0',
            set.is_warmup ? 'bg-orange-500/10 text-orange-400' : 'bg-white/[0.04] text-[var(--text-faint)]',
          )}>
            {set.is_warmup ? 'W' : set.set_number}
          </span>

          {/* Summary */}
          <span className="flex-1 mono text-sm text-[var(--text-low)] tracking-tight">
            {set.weight_kg > 0 ? `${set.weight_kg}kg` : '—'}
            {' × '}
            {set.reps > 0 ? set.reps : '—'}
            {e1rm && <span className="text-[9px] text-[var(--text-faint)] ml-1.5">· ~{e1rm}kg</span>}
            {!set.is_warmup && set.rpe !== null && (
              <span className="text-[10px] text-[var(--text-faint)] ml-1.5">· RPE {set.rpe}</span>
            )}
          </span>

          {/* Desktop delete */}
          <button
            onClick={handleRemove}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[var(--text-faint)] opacity-0 group-hover:opacity-100 hover:bg-[var(--rose)]/10 transition-all"
            style={{ color: 'var(--text-faint)' }}
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
    return <CompletedSetRow set={set} onDone={onDone} onRemove={onRemove} />
  }
  return <ActiveSetRow set={set} prevSetText={prevSetText} suggestion={suggestion} onChange={onChange} onDone={onDone} onRemove={onRemove} />
}

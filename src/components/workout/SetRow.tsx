'use client'

import { useRef, useState, useCallback } from 'react'
import { Check, Trash2, X } from 'lucide-react'
import type { ActiveSet } from '@/types/database'
import { cn } from '@/lib/utils'

interface SetRowProps {
  set: ActiveSet
  prevSetText?: string
  onChange: (updates: Partial<ActiveSet>) => void
  onDone: () => void
  onRemove: () => void
}

// ─── Atom: stepper ±strip button ─────────────────────────────────────────────

function StepBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-9 h-full flex items-center justify-center text-[#4a5568] hover:text-[#CCFF00] hover:bg-[#CCFF00]/5 active:scale-95 transition-colors font-black text-base shrink-0"
    >
      {children}
    </button>
  )
}

// ─── Active set ───────────────────────────────────────────────────────────────

function ActiveSetRow({ set, prevSetText, onChange, onDone, onRemove }: SetRowProps) {
  const [ticked, setTicked] = useState(false)

  const handleDone = useCallback(() => {
    // Trigger scale-pulse animation, then fire onDone after the peak
    setTicked(true)
    setTimeout(() => {
      setTicked(false)
      onDone()
    }, 180)
  }, [onDone])

  return (
    <div className="mb-2">
      {/* Main row */}
      <div className="flex items-center gap-2 py-1.5">
        {/* Set badge */}
        <div className="w-8 shrink-0 flex items-center justify-center">
          <span className={cn(
            'font-black text-xs w-6 h-6 flex items-center justify-center rounded',
            set.is_warmup
              ? 'bg-orange-500/10 text-orange-400'
              : 'bg-[#151b2d] text-[#adb4ce]',
          )}>
            {set.is_warmup ? 'W' : set.set_number}
          </span>
        </div>

        {/* Previous */}
        <div className="w-14 shrink-0 text-center text-[11px] font-body text-[#4a5568]">
          {prevSetText}
        </div>

        {/* Weight input */}
        <input
          type="text"
          inputMode="decimal"
          value={set.weight_kg > 0 ? set.weight_kg : ''}
          placeholder="0"
          onChange={e => {
            const v = parseFloat(e.target.value)
            onChange({ weight_kg: isNaN(v) ? 0 : v })
          }}
          className="flex-1 h-10 bg-[#0c1324] border border-[#334155] rounded-lg text-center font-black text-base text-white placeholder:text-[#334155] focus:outline-none focus:border-[#CCFF00]/50 transition-colors"
        />

        {/* Reps input */}
        <input
          type="text"
          inputMode="numeric"
          value={set.reps > 0 ? set.reps : ''}
          placeholder="0"
          onChange={e => {
            const v = parseInt(e.target.value, 10)
            onChange({ reps: isNaN(v) ? 0 : v })
          }}
          className="flex-1 h-10 bg-[#0c1324] border border-[#334155] rounded-lg text-center font-black text-base text-white placeholder:text-[#334155] focus:outline-none focus:border-[#CCFF00]/50 transition-colors"
        />

        {/* Done button — scale-pulse animation on tap */}
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

      {/* Stepper strip */}
      <div className="space-y-1.5 pb-1">
        {/* Weight + reps steppers */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center h-9 bg-[#0c1324] border border-[#334155] rounded-lg overflow-hidden">
            <StepBtn onClick={() => onChange({ weight_kg: Math.max(0, set.weight_kg - 2.5) })}>−</StepBtn>
            <span className="flex-1 text-center text-[11px] font-black text-[#adb4ce] tabular-nums pointer-events-none">
              {set.weight_kg > 0 ? `${set.weight_kg} kg` : '— kg'}
            </span>
            <StepBtn onClick={() => onChange({ weight_kg: Math.round((set.weight_kg + 2.5) * 10) / 10 })}>+</StepBtn>
          </div>

          <div className="flex-1 flex items-center h-9 bg-[#0c1324] border border-[#334155] rounded-lg overflow-hidden">
            <StepBtn onClick={() => onChange({ reps: Math.max(0, set.reps - 1) })}>−</StepBtn>
            <span className="flex-1 text-center text-[11px] font-black text-[#adb4ce] tabular-nums pointer-events-none">
              {set.reps > 0 ? `${set.reps} reps` : '— reps'}
            </span>
            <StepBtn onClick={() => onChange({ reps: set.reps + 1 })}>+</StepBtn>
          </div>
        </div>

        {/* RPE + delete (non-warmup) */}
        {!set.is_warmup && (
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center h-9 bg-[#0c1324] border border-[#334155] rounded-lg overflow-hidden">
              <StepBtn onClick={() => onChange({ rpe: Math.max(6, (set.rpe ?? 7) - 0.5) })}>−</StepBtn>
              <span className={cn(
                'flex-1 text-center text-[11px] font-black tabular-nums pointer-events-none',
                set.rpe !== null ? 'text-[#adb4ce]' : 'text-[#334155]',
              )}>
                {set.rpe !== null ? `RPE ${set.rpe}` : 'RPE —'}
              </span>
              <StepBtn onClick={() => onChange({ rpe: Math.min(10, (set.rpe ?? 7) + 0.5) })}>+</StepBtn>
            </div>

            <button
              onClick={onRemove}
              className="w-9 h-9 shrink-0 flex items-center justify-center bg-[#0c1324] border border-[#334155] rounded-lg text-[#4a5568] hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-colors"
              aria-label="Remove set"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Warmup: delete only */}
        {set.is_warmup && (
          <div className="flex justify-end">
            <button
              onClick={onRemove}
              className="w-9 h-9 flex items-center justify-center bg-[#0c1324] border border-[#334155] rounded-lg text-[#4a5568] hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 transition-colors"
              aria-label="Remove set"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
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
  // Swipe-to-delete (touch only — no hover translate on desktop)
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
    <div className="relative group overflow-hidden rounded-lg mb-1">
      {/* Swipe delete background */}
      <div className="absolute inset-y-0 right-0 w-16 bg-red-500/10 flex items-center justify-center rounded-r-lg">
        <button
          onClick={onRemove}
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
        {/* Tap ✓ to untick and reopen */}
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
          {!set.is_warmup && set.rpe !== null && (
            <span className="text-[10px] font-body text-[#334155] ml-2">· RPE {set.rpe}</span>
          )}
        </span>

        {/* Desktop-only delete — fades in on hover, no translate */}
        <button
          onClick={onRemove}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#334155] opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/5 transition-all"
          aria-label="Remove set"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}

// ─── Public export ────────────────────────────────────────────────────────────

export function SetRow({ set, prevSetText = '-', onChange, onDone, onRemove }: SetRowProps) {
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
      onChange={onChange}
      onDone={onDone}
      onRemove={onRemove}
    />
  )
}

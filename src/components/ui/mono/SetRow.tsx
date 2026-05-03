'use client'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SetRowProps {
  setNumber: number
  weight: number | string
  reps: number | string
  completed?: boolean
  onWeightClick?: () => void
  onRepsChange?: (value: number) => void
  onComplete?: () => void
  weightUnit?: string
}

/**
 * Logger row for the active workout. 4-column grid:
 * set# · weight (tap → plate calc) · reps (input) · check.
 * Completed state dims the row and lights the check with accent glow.
 */
export function SetRow({
  setNumber,
  weight,
  reps,
  completed = false,
  onWeightClick,
  onRepsChange,
  onComplete,
  weightUnit = 'kg',
}: SetRowProps) {
  return (
    <div
      className={cn(
        'grid items-center gap-2 py-2 transition-opacity duration-200',
        'grid-cols-[32px_1fr_1fr_44px]',
        completed && 'opacity-60',
      )}
    >
      <div className="mono text-[13px] text-[var(--text-mid)]">{setNumber}</div>

      <button
        type="button"
        onClick={onWeightClick}
        className={cn(
          'h-[38px] rounded-[10px] px-2.5',
          'bg-white/[0.04] border border-white/10',
          'mono text-[13px] text-[var(--text-hi)] text-center',
          'transition-colors active:bg-white/[0.06]',
        )}
      >
        {weight}{' '}
        <span className="text-[10px] text-[var(--text-low)]">{weightUnit}</span>
      </button>

      <input
        type="number"
        inputMode="numeric"
        value={reps}
        onChange={(e) => onRepsChange?.(parseInt(e.target.value) || 0)}
        className={cn(
          'h-[38px] w-full rounded-[10px] px-2.5',
          'bg-white/[0.04] border border-white/10',
          'mono text-[13px] text-[var(--text-hi)] text-center',
          'outline-none focus:border-[var(--accent-line)]',
        )}
      />

      <button
        type="button"
        onClick={onComplete}
        className={cn(
          'w-[38px] h-[38px] rounded-[10px] justify-self-end',
          'flex items-center justify-center',
          'transition-all duration-150',
          completed
            ? 'bg-[var(--accent)] border border-[var(--accent)] text-[var(--accent-on)] shadow-[0_0_16px_var(--accent-glow)]'
            : 'bg-transparent border border-white/[0.12] text-[var(--text-low)]',
        )}
        aria-label={completed ? 'Mark set incomplete' : 'Complete set'}
        aria-pressed={completed}
      >
        <Check size={16} strokeWidth={2.5} />
      </button>
    </div>
  )
}

interface SetRowHeaderProps {
  className?: string
}
export function SetRowHeader({ className }: SetRowHeaderProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-[32px_1fr_1fr_44px] gap-2 pb-2',
        'text-[9px] tracking-[0.16em] uppercase text-[var(--text-low)]',
        className,
      )}
    >
      <div>Set</div>
      <div className="text-center">Weight</div>
      <div className="text-center">Reps</div>
      <div />
    </div>
  )
}

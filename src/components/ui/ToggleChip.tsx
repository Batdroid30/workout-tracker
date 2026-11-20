import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

const TOGGLE_CHIP_SIZES = {
  md: 'min-h-11',
  sm: 'min-h-9',
} as const

// Both states carry a 1px border so toggling never shifts the layout.
const TOGGLE_CHIP_STATES = {
  selected: 'bg-primary text-bg border border-primary',
  unselected: 'bg-surface-raised text-secondary border border-border',
} as const

export type ToggleChipSize = keyof typeof TOGGLE_CHIP_SIZES

export interface ToggleChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  selected: boolean
  size?: ToggleChipSize
}

export const ToggleChip = forwardRef<HTMLButtonElement, ToggleChipProps>(
  ({ selected, size = 'md', className, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={cn(
        'focus-ring inline-flex items-center justify-center px-4 rounded-pill text-sm font-medium transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed',
        TOGGLE_CHIP_SIZES[size],
        selected ? TOGGLE_CHIP_STATES.selected : TOGGLE_CHIP_STATES.unselected,
        className,
      )}
      {...props}
    />
  ),
)
ToggleChip.displayName = 'ToggleChip'

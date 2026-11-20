import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'
import { cn } from '@/lib/utils'

const ICON_BUTTON_VARIANTS = {
  ghost: 'text-secondary hover:text-primary',
  primary: 'bg-accent text-on-accent',
  secondary: 'bg-surface-raised text-primary border border-border-strong',
} as const

export type IconButtonVariant = keyof typeof ICON_BUTTON_VARIANTS

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string
  variant?: IconButtonVariant
  children: ReactNode
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant = 'ghost', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'focus-ring inline-flex size-11 items-center justify-center rounded-pill transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed',
        ICON_BUTTON_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  ),
)
IconButton.displayName = 'IconButton'

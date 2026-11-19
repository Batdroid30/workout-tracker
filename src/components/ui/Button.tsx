import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const BUTTON_VARIANTS = {
  primary: 'bg-accent text-on-accent active:bg-[var(--lime-pressed)]',
  secondary: 'bg-surface-raised text-primary border border-border-strong',
  ghost: 'text-secondary hover:text-primary',
  outline: 'border border-border-strong text-primary',
  destructive: 'bg-negative-soft text-negative',
} as const

const BUTTON_SIZES = {
  md: 'min-h-12',
  sm: 'min-h-10',
} as const

export type ButtonVariant = keyof typeof BUTTON_VARIANTS
export type ButtonSize = keyof typeof BUTTON_SIZES

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leadingIcon?: ReactNode
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      leadingIcon,
      fullWidth = true,
      disabled,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'focus-ring inline-flex items-center justify-center gap-2 px-5 rounded-pill text-[15px] font-semibold transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : leadingIcon}
      {children}
    </button>
  ),
)
Button.displayName = 'Button'

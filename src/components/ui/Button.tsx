import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', style, ...props }, ref) => {
    const variantStyle =
      variant === 'primary'   ? { background: 'var(--accent)',                    color: 'var(--accent-on)' } :
      variant === 'secondary' ? { background: 'rgba(255,255,255,0.05)',           color: 'var(--text-mid)', border: '1px solid var(--glass-border)' } :
      variant === 'outline'   ? { background: 'transparent', border: '1px solid var(--accent-line)', color: 'var(--accent)' } :
      {}

    return (
      <button
        ref={ref}
        className={cn(
          'min-h-[44px] w-full flex items-center justify-center font-semibold px-4 rounded-[var(--radius-pill)] transition-all active:scale-[0.97] tracking-widest uppercase text-xs hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed',
          variant === 'ghost' && 'bg-transparent text-[var(--text-mid)] hover:text-[var(--text-hi)] hover:opacity-100',
          className,
        )}
        style={{ ...variantStyle, ...style }}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

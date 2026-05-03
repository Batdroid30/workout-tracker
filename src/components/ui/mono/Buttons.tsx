import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Primary CTA — platinum gradient with accent glow.
 * One per screen, max. Reserved for the loud action.
 */
export const BtnPrimary = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function BtnPrimary({ className, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2.5',
          'h-14 px-7 rounded-full',
          'font-sans font-semibold text-sm text-[var(--accent-on)]',
          'bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(220,220,200,0.85))]',
          'border border-white/50',
          'shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_0_28px_var(--accent-glow),0_8px_24px_rgba(0,0,0,0.4)]',
          'transition-transform duration-150 ease-out',
          'active:scale-[0.97]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    )
  },
)

/**
 * Glass button — secondary action.
 * Glass-fill-strong, hairline border, soft inset highlight.
 */
export const BtnGlass = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function BtnGlass({ className, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2',
          'h-11 px-5 rounded-full',
          'font-sans font-medium text-[13px] text-[var(--text-hi)]',
          'bg-[var(--glass-fill-strong)] border border-[var(--glass-border-strong)]',
          'backdrop-blur-[20px]',
          'shadow-[inset_0_1px_0_var(--glass-highlight)]',
          'transition-transform duration-150 ease-out',
          'active:scale-[0.97]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    )
  },
)

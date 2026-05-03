import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex min-h-[48px] w-full rounded-[var(--radius-inner)] px-4 py-2 text-base focus:outline-none transition-colors',
          className,
        )}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-hi)',
        }}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex min-h-12 w-full rounded-control border border-border-strong bg-surface-raised px-4 py-2 text-base text-primary placeholder:text-tertiary focus:border-accent focus:outline-none transition-colors',
          className,
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

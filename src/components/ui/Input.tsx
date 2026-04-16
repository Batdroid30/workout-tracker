import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex min-h-[48px] w-full rounded-xl bg-zinc-900 border border-zinc-800 px-4 py-2 text-base text-white font-sans focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent placeholder:text-zinc-500",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

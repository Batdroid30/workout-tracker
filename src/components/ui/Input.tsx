import { InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex min-h-[48px] w-full rounded-xl bg-[#0c1324] border border-[#334155] px-4 py-2 text-base text-[#dce1fb] font-body focus:outline-none focus:border-[#CCFF00]/50 focus:ring-1 focus:ring-[#CCFF00]/20 placeholder:text-[#334155] transition-colors",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

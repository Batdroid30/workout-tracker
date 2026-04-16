import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "min-h-[48px] w-full flex items-center justify-center font-bold px-4 rounded-xl transition-colors active:scale-[0.98]",
          variant === 'primary' && "bg-brand text-white hover:bg-brand-hover",
          variant === 'secondary' && "bg-zinc-800 text-white hover:bg-zinc-700",
          variant === 'ghost' && "bg-transparent text-zinc-400 hover:text-white",
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

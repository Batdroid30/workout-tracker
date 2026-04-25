import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline-lime'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "min-h-[44px] w-full flex items-center justify-center font-black px-4 rounded-xl transition-all active:scale-[0.97] tracking-widest uppercase text-xs",
          variant === 'primary' && "bg-[#CCFF00] text-[#020617] hover:bg-[#abd600] shadow-[0_4px_20px_rgba(204,255,0,0.2)]",
          variant === 'secondary' && "bg-[#151b2d] text-[#dce1fb] border border-[#334155] hover:bg-[#191f31]",
          variant === 'ghost' && "bg-transparent text-[#adb4ce] hover:text-[#dce1fb]",
          variant === 'outline-lime' && "bg-transparent border border-[#CCFF00] text-[#CCFF00] hover:bg-[#CCFF00]/10",
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

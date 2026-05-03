import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface StatBlockProps {
  label: string
  value: ReactNode
  sub?: ReactNode
  accent?: boolean
  align?: 'left' | 'center'
  className?: string
}

/**
 * Big-number stat. Mono numeric, optional accent glow.
 * Used for hero metrics (Strength Index, Lifetime Tonnage, This Week).
 */
export function StatBlock({ label, value, sub, accent = false, align = 'left', className }: StatBlockProps) {
  return (
    <div className={cn(align === 'center' && 'text-center', className)}>
      <div className="t-label mb-1">{label}</div>
      <div
        className={cn(
          'mono font-medium leading-none',
          'text-[44px] tracking-[-0.02em]',
          accent
            ? 'text-[var(--accent)] [text-shadow:0_0_24px_var(--accent-glow)]'
            : 'text-[var(--text-hi)]',
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-[11px] text-[var(--text-low)]">{sub}</div>}
    </div>
  )
}

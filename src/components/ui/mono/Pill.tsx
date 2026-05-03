import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

type PillTone = 'accent' | 'teal' | 'rose' | 'mute'

interface PillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone
  dot?: boolean
  children: ReactNode
}

const tones: Record<PillTone, { bg: string; line: string; fg: string; dot: string }> = {
  accent: {
    bg:   'bg-[var(--accent-soft)]',
    line: 'border-[var(--accent-line)]',
    fg:   'text-[var(--accent)]',
    dot:  'bg-[var(--accent)] shadow-[0_0_6px_var(--accent-glow)]',
  },
  teal: {
    bg:   'bg-[rgba(127,217,200,0.10)]',
    line: 'border-[rgba(127,217,200,0.32)]',
    fg:   'text-[var(--teal)]',
    dot:  'bg-[var(--teal)] shadow-[0_0_6px_rgba(127,217,200,0.5)]',
  },
  rose: {
    bg:   'bg-[rgba(230,163,154,0.10)]',
    line: 'border-[rgba(230,163,154,0.32)]',
    fg:   'text-[var(--rose)]',
    dot:  'bg-[var(--rose)] shadow-[0_0_6px_rgba(230,163,154,0.5)]',
  },
  mute: {
    bg:   'bg-white/[0.04]',
    line: 'border-white/10',
    fg:   'text-[var(--text-mid)]',
    dot:  'bg-[var(--text-low)]',
  },
}

export function Pill({ tone = 'accent', dot = true, className, children, ...rest }: PillProps) {
  const t = tones[tone]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 h-[26px] px-3 rounded-full border font-mono text-[10px] tracking-[0.12em] uppercase',
        t.bg, t.line, t.fg, className,
      )}
      {...rest}
    >
      {dot && <span className={cn('w-[5px] h-[5px] rounded-full', t.dot)} />}
      {children}
    </span>
  )
}

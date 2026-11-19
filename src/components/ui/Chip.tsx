import { ReactNode } from 'react'

const CHIP_TONES = {
  neutral: 'bg-surface-raised text-secondary',
  accent: 'bg-accent-soft text-accent',
  positive: 'bg-positive-soft text-positive',
  caution: 'bg-caution-soft text-caution',
  negative: 'bg-negative-soft text-negative',
} as const

export type ChipTone = keyof typeof CHIP_TONES

export interface ChipProps {
  tone?: ChipTone
  icon?: ReactNode
  children: ReactNode
}

export function Chip({ tone = 'neutral', icon, children }: ChipProps) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 px-2.5 rounded-pill text-xs font-medium ${CHIP_TONES[tone]}`}
    >
      {icon}
      {children}
    </span>
  )
}

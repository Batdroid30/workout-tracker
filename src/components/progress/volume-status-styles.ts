import type { VolumeStatus } from '@/lib/phase-coach'

// ── Volume status styling, shared across Phase Coach and the body map ──────
// Tailwind classes style the HTML badges; `fill` is the CSS colour used to
// paint muscles on the body map. Every colour is a status token.

export interface VolumeStatusStyle {
  dot: string
  text: string
  label: string
  bg: string
  bar: string
  fill: string
}

const NEGATIVE_STYLE = {
  dot: 'bg-negative',
  text: 'text-negative',
  bg: 'bg-negative-soft',
  bar: 'bg-negative',
  fill: 'var(--negative)',
} as const

const CAUTION_STYLE = {
  dot: 'bg-caution',
  text: 'text-caution',
  bg: 'bg-caution-soft',
  bar: 'bg-caution',
  fill: 'var(--caution)',
} as const

const POSITIVE_STYLE = {
  dot: 'bg-positive',
  text: 'text-positive',
  bg: 'bg-positive-soft',
  bar: 'bg-positive',
  fill: 'var(--positive)',
} as const

export const VOLUME_STATUS_STYLES: Record<VolumeStatus, VolumeStatusStyle> = {
  below_mv:    { ...NEGATIVE_STYLE, label: 'Below MV' },
  maintenance: { ...CAUTION_STYLE,  label: 'Maintaining' },
  sub_optimal: { ...CAUTION_STYLE,  label: 'Sub-optimal' },
  optimal:     { ...POSITIVE_STYLE, label: 'Optimal' },
  high:        { ...CAUTION_STYLE,  label: 'High volume' },
  over_mrv:    { ...NEGATIVE_STYLE, label: 'Over MRV' },
}

export const STATUS_PRIORITY: Record<VolumeStatus, number> = {
  over_mrv: 0, below_mv: 1, maintenance: 2, sub_optimal: 3, high: 4, optimal: 5,
}

import type { VolumeStatus } from '@/lib/phase-coach'

// ── Volume status styling, shared across Phase Coach and the body map ──────
// Tailwind classes style the HTML badges; `fill` is the CSS colour used to
// paint muscles on the body map; `zone`/`zoneBorder` shade the landmark bar
// and legend swatches. Statuses are ordered by volume, and each one differs
// from every other in hue or by at least two opacity steps:
//   below MV (faint red) < maintenance (grey) < sub-optimal (faint amber)
//   < optimal (green) < high (strong amber) < over MRV (red)

export interface VolumeStatusStyle {
  dot: string
  text: string
  label: string
  bg: string
  bar: string
  fill: string
  zone: string
  zoneBorder: string
}

export const VOLUME_STATUS_STYLES: Record<VolumeStatus, VolumeStatusStyle> = {
  below_mv: {
    dot: 'bg-negative/40',
    text: 'text-negative',
    label: 'Below MV',
    bg: 'bg-negative-soft',
    bar: 'bg-negative/40',
    fill: 'color-mix(in srgb, var(--negative) 40%, transparent)',
    zone: 'bg-negative/15',
    zoneBorder: 'border-negative/30',
  },
  maintenance: {
    dot: 'bg-tertiary',
    text: 'text-secondary',
    label: 'Maintaining',
    bg: 'bg-surface',
    bar: 'bg-tertiary',
    fill: 'var(--text-tertiary)',
    zone: 'bg-tertiary/25',
    zoneBorder: 'border-tertiary/50',
  },
  sub_optimal: {
    dot: 'bg-caution/40',
    text: 'text-caution',
    label: 'Sub-optimal',
    bg: 'bg-caution-soft',
    bar: 'bg-caution/40',
    fill: 'color-mix(in srgb, var(--caution) 40%, transparent)',
    zone: 'bg-caution/15',
    zoneBorder: 'border-caution/35',
  },
  optimal: {
    dot: 'bg-positive',
    text: 'text-positive',
    label: 'Optimal',
    bg: 'bg-positive-soft',
    bar: 'bg-positive',
    fill: 'var(--positive)',
    zone: 'bg-positive/25',
    zoneBorder: 'border-positive/40',
  },
  high: {
    dot: 'bg-caution',
    text: 'text-caution',
    label: 'High volume',
    bg: 'bg-caution/25',
    bar: 'bg-caution',
    fill: 'var(--caution)',
    zone: 'bg-caution/45',
    zoneBorder: 'border-caution/60',
  },
  over_mrv: {
    dot: 'bg-negative',
    text: 'text-negative',
    label: 'Over MRV',
    bg: 'bg-negative-soft',
    bar: 'bg-negative',
    fill: 'var(--negative)',
    zone: 'bg-negative/40',
    zoneBorder: 'border-negative/60',
  },
}

export const STATUS_PRIORITY: Record<VolumeStatus, number> = {
  over_mrv: 0, below_mv: 1, maintenance: 2, sub_optimal: 3, high: 4, optimal: 5,
}

import type { VolumeStatus } from '@/lib/phase-coach'

// ── Volume status styling, shared across Phase Coach and the body map ──────
// Tailwind classes style the HTML badges; `fill` is the raw SVG colour used
// to paint muscles on the body map.

export interface VolumeStatusStyle {
  dot: string
  text: string
  label: string
  bg: string
  border: string
  fillGradient: string
  glowColor: string
  fill: string
}

export const VOLUME_STATUS_STYLES: Record<VolumeStatus, VolumeStatusStyle> = {
  below_mv: {
    dot: 'bg-red-400',
    text: 'text-red-400',
    label: 'Below MV',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    fillGradient: 'from-red-500/20 to-red-400/80',
    glowColor: 'rgba(239, 68, 68, 0.4)',
    fill: '#f87171',
  },
  maintenance: {
    dot: 'bg-orange-400',
    text: 'text-orange-400',
    label: 'Maintaining',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    fillGradient: 'from-orange-500/20 to-orange-400/80',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    fill: '#fb923c',
  },
  sub_optimal: {
    dot: 'bg-yellow-400',
    text: 'text-yellow-400',
    label: 'Sub-optimal',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    fillGradient: 'from-yellow-500/20 to-yellow-400/80',
    glowColor: 'rgba(234, 179, 8, 0.4)',
    fill: '#facc15',
  },
  optimal: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-400',
    label: 'Optimal',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    fillGradient: 'from-emerald-600/30 to-emerald-400',
    glowColor: 'rgba(16, 185, 129, 0.5)',
    fill: '#10b981',
  },
  high: {
    dot: 'bg-orange-400',
    text: 'text-orange-400',
    label: 'High Volume',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    fillGradient: 'from-orange-500/20 to-orange-400/80',
    glowColor: 'rgba(249, 115, 22, 0.4)',
    fill: '#fb923c',
  },
  over_mrv: {
    dot: 'bg-red-500',
    text: 'text-red-500',
    label: 'Over MRV',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    fillGradient: 'from-red-600/30 to-red-500',
    glowColor: 'rgba(239, 68, 68, 0.5)',
    fill: '#ef4444',
  },
}

export const STATUS_PRIORITY: Record<VolumeStatus, number> = {
  over_mrv: 0, below_mv: 1, maintenance: 2, sub_optimal: 3, high: 4, optimal: 5,
}

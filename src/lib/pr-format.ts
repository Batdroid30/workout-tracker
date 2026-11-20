import type { PRType } from '@/types/database'

export const PR_TYPE_LABELS: Record<PRType, string> = {
  best_1rm:    'e1RM',
  best_weight: 'Max weight',
  best_volume: 'Best volume',
}

export function formatPRValue(prType: PRType, value: number): string {
  if (prType === 'best_1rm' || prType === 'best_weight') return `${value.toFixed(1)} kg`
  // best_volume is total volume — format with k suffix if large
  return value >= 1000 ? `${(value / 1000).toFixed(1)}k kg` : `${Math.round(value)} kg`
}

const SECONDARY_MUSCLE_CREDIT = 0.5

/**
 * Credits a working set to weekly per-muscle counts: the primary muscle gets
 * a full set, each distinct secondary muscle gets half a set. One rule shared
 * by the coach chat and the Phase Coach so their numbers agree.
 */
export function addSetToMuscleCounts(
  counts: Record<string, number>,
  primary: string | null | undefined,
  secondaries: readonly string[] | null | undefined,
  sets = 1,
): void {
  if (primary) counts[primary] = (counts[primary] ?? 0) + sets

  for (const secondary of new Set(secondaries ?? [])) {
    if (secondary === primary) continue
    counts[secondary] = (counts[secondary] ?? 0) + SECONDARY_MUSCLE_CREDIT * sets
  }
}

/** Database JSON may be null or malformed; keep only string entries of an array. */
export function readSecondaryMuscles(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  return value.filter((entry): entry is string => typeof entry === 'string')
}

/** Formats a (possibly fractional) set count with at most one decimal: 7.5, 8. */
export function formatSetCount(count: number): string {
  return String(Math.round(count * 10) / 10)
}

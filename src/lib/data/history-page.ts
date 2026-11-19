/**
 * Splits a page fetched with one extra look-ahead row into the visible items
 * and a flag telling whether another page exists.
 */
export function splitPage<T>(rows: T[], pageSize: number): { items: T[]; hasMore: boolean } {
  return { items: rows.slice(0, pageSize), hasMore: rows.length > pageSize }
}

export interface HistoryCursor {
  startedAt: string
  id: string
}

/** Cursor pointing just past the last loaded row; null when nothing is loaded yet. */
export function nextCursor(rows: { started_at: string; id: string }[]): HistoryCursor | null {
  const last = rows[rows.length - 1]
  return last ? { startedAt: last.started_at, id: last.id } : null
}

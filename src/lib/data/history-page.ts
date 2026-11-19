/**
 * Splits a page fetched with one extra look-ahead row into the visible items
 * and a flag telling whether another page exists.
 */
export function splitPage<T>(rows: T[], pageSize: number): { items: T[]; hasMore: boolean } {
  return { items: rows.slice(0, pageSize), hasMore: rows.length > pageSize }
}

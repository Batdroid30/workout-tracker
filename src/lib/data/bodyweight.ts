import { cache } from 'react'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'

// ── Types ────────────────────────────────────────────────────────────────────

export interface BodyweightPoint {
  /** ISO date string 'YYYY-MM-DD' */
  date:      string
  weight_kg: number
}

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all bodyweight readings in the last `weeks` weeks, oldest-first
 * so chart consumers can use them directly without reversing.
 *
 * Multiple readings on the same day are all included — the chart shows them
 * individually. For a "daily average" chart, callers can group themselves.
 */
export const getBodyweightHistory = cache(async (
  userId: string,
  weeks = 12,
): Promise<BodyweightPoint[]> => {
  const supabase = getSupabaseAdmin()
  const since = new Date(Date.now() - weeks * 7 * 86400_000)

  const { data, error } = await supabase
    .from('bodyweight_log')
    .select('weight_kg, logged_at')
    .eq('user_id', userId)
    .gte('logged_at', since.toISOString())
    .order('logged_at', { ascending: true })

  if (error) throw new DatabaseError('Failed to fetch bodyweight history', error)

  return (data ?? []).map(row => ({
    date:      (row.logged_at as string).split('T')[0],
    weight_kg: Number(row.weight_kg),
  }))
})

/**
 * Returns the single most-recent bodyweight reading, or null if none exists.
 * Used to pre-fill the quick-log input on /progress.
 */
export const getLatestBodyweight = cache(async (
  userId: string,
): Promise<BodyweightPoint | null> => {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('bodyweight_log')
    .select('weight_kg, logged_at')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new DatabaseError('Failed to fetch latest bodyweight', error)
  if (!data) return null

  return {
    date:      (data.logged_at as string).split('T')[0],
    weight_kg: Number(data.weight_kg),
  }
})

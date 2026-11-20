import { cache } from 'react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'

const DAY_MS = 86_400_000

// One heavy set can break the weight and the e1RM record at once; that's one PR to the lifter.
export function countDistinctPRSets(rows: { set_id: string | null }[]): number {
  const sets = new Set<string>()
  let withoutSet = 0
  for (const row of rows) {
    if (row.set_id) sets.add(row.set_id)
    else withoutSet += 1
  }
  return sets.size + withoutSet
}

export const countRecentPRs = cache(async (userId: string, days: number): Promise<number> => {
  const supabase = await getSupabaseServer()
  const since = new Date(Date.now() - days * DAY_MS).toISOString()
  const { data, error } = await supabase
    .from('personal_records')
    .select('set_id')
    .eq('user_id', userId)
    .gte('achieved_at', since)

  if (error) throw new DatabaseError(`Failed to count recent PRs: ${error.message}`, error)
  return countDistinctPRSets(data ?? [])
})

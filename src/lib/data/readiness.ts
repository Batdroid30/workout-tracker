import { cache } from 'react'
import { resolveSupabaseClient } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'
import type { ReadinessLog } from '@/types/database'

export const getTodayReadiness = cache(async (userId: string, runAsAdmin: boolean = false): Promise<ReadinessLog | null> => {
  const supabase = await resolveSupabaseClient(runAsAdmin)
  
  // Get current date string in YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('readiness_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_at', today)
    .maybeSingle()

  if (error) {
    console.error('Failed to fetch today readiness:', error.message)
    throw new DatabaseError('Failed to fetch today readiness', error)
  }

  return data
})

export const getRecentReadinessLogs = cache(async (userId: string, days: number = 7, runAsAdmin: boolean = false): Promise<ReadinessLog[]> => {
  const supabase = await resolveSupabaseClient(runAsAdmin)
  
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceDateStr = since.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('readiness_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('logged_at', sinceDateStr)
    .order('logged_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch recent readiness logs:', error.message)
    throw new DatabaseError('Failed to fetch recent readiness logs', error)
  }

  return data || []
})

export async function saveReadiness(
  userId: string, 
  data: { sleep_score: number; soreness_score: number; energy_score: number }, 
  runAsAdmin: boolean = false
): Promise<ReadinessLog> {
  const supabase = await resolveSupabaseClient(runAsAdmin)

  const today = new Date().toISOString().split('T')[0]

  const { data: result, error } = await supabase
    .from('readiness_logs')
    .upsert({
      user_id: userId,
      sleep_score: data.sleep_score,
      soreness_score: data.soreness_score,
      energy_score: data.energy_score,
      logged_at: today,
    }, {
      onConflict: 'user_id, logged_at'
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to save readiness log:', error.message)
    throw new DatabaseError('Failed to save readiness log', error)
  }

  return result
}

import { cache } from 'react'
import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server'
import type { Profile } from '@/types/database'

export const getProfile = cache(async (userId: string): Promise<Profile | null> => {
  const supabase = getSupabaseAdmin()

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  // DB stores training_* / experience_level as text columns with check
  // constraints; the generated types are string|null. Narrowing here is
  // safe — anything outside the union would have failed the constraint.
  if (!profileError && profileData) return profileData as Profile

  // Fallback: synthesise from the auth session user
  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId)

  if (userError || !user) {
    console.error('Error fetching user from auth:', userError?.message)
    return null
  }

  return {
    id: user.id,
    first_name: user.user_metadata?.first_name || null,
    last_name: user.user_metadata?.last_name || null,
    avatar_url: user.user_metadata?.avatar_url || null,
    rest_timer_seconds: 90,
    weekly_goal_sessions: 3,
    updated_at: user.updated_at || new Date().toISOString(),
    training_goal:    null,
    training_phase:   null,
    training_style:   null,
    experience_level: null,
    phase_started_at: null,
  }
})

// ── Write (never cached) ──────────────────────────────────────────────────────

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const supabase = await getSupabaseServer()

  const upsertPayload = {
    id: userId,
    ...updates,
    updated_at: new Date().toISOString(),
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .upsert(upsertPayload)
    .select()
    .single()

  const authUpdates: any = {}
  if (updates.first_name !== undefined) authUpdates.first_name = updates.first_name
  if (updates.last_name !== undefined) authUpdates.last_name = updates.last_name
  if (updates.avatar_url !== undefined) authUpdates.avatar_url = updates.avatar_url

  const { error: authError } = await supabase.auth.updateUser({ data: authUpdates })
  if (authError) console.error('Error updating auth metadata:', authError.message)

  if (!profileError) return profileData
  return { id: userId, ...updates } as Profile
}

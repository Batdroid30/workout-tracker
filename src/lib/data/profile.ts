import { getSupabaseServer } from '@/lib/supabase/server'
import { Profile } from '@/types/database'

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await getSupabaseServer()
  
  // 1. Try to get from profiles table
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!profileError && profileData) {
    return profileData
  }

  // 2. Fallback: Try to get from current session user
  // Using getUser() without ID because it uses the bearer token from cookies
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    console.error('Error fetching user from auth:', userError?.message)
    return null
  }

  // Double check ID matches if provided
  if (userId && user.id !== userId) {
    console.warn('Requested userId does not match session user')
    // We can't use admin API without service key, so we return what we have or null
  }

  return {
    id: user.id,
    email: user.email || '',
    first_name: user.user_metadata?.first_name || null,
    last_name: user.user_metadata?.last_name || null,
    avatar_url: user.user_metadata?.avatar_url || null,
    updated_at: user.updated_at || new Date().toISOString()
  }
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const supabase = await getSupabaseServer()
  
  // 1. Try to update profiles table (soft fail if missing)
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      ...updates,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  // 2. Also update auth user_metadata for the current user
  const authUpdates: any = {}
  if (updates.first_name !== undefined) authUpdates.first_name = updates.first_name
  if (updates.last_name !== undefined) authUpdates.last_name = updates.last_name
  if (updates.avatar_url !== undefined) authUpdates.avatar_url = updates.avatar_url

  const { error: authError } = await supabase.auth.updateUser({
    data: authUpdates
  })

  if (authError) {
    console.error('Error updating auth metadata:', authError.message)
  }

  // If the profile table exists and worked, return that
  if (!profileError) return profileData

  // Otherwise, return the synthesized profile
  return {
    id: userId,
    ...updates
  } as Profile
}

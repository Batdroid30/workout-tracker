import { getSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function requireAuth() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  return {
    session: { user },
    userId: user.id
  }
}

export async function signOutUser() {
  const supabase = await getSupabaseServer()
  await supabase.auth.signOut()
  redirect('/login')
}

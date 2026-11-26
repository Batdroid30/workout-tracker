import { cache } from 'react'
import { getSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// The middleware already asks the Auth server about this session on every
// request, so here we only verify the JWT. With the project's asymmetric
// signing keys getClaims() checks it locally, with no network call.
// cache() lets the layout and the page share one check per request.
export const requireAuth = cache(async () => {
  const supabase = await getSupabaseServer()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (!claims?.sub) {
    redirect('/login')
  }

  const user = { id: claims.sub, email: claims.email }
  return {
    session: { user },
    userId: user.id
  }
})

export async function signOutUser() {
  const supabase = await getSupabaseServer()
  await supabase.auth.signOut()
  redirect('/login')
}

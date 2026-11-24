import { redirect } from 'next/navigation'
import { type NextRequest } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { confirmEmailLink } from './confirm-email-link'

// The reset email links here. Verifying sets the session cookie, and the
// redirect takes the one-time token out of the address bar straight away.
export async function GET(request: NextRequest): Promise<never> {
  const supabase = await getSupabaseServer()
  const next = await confirmEmailLink(request.nextUrl.searchParams, params => supabase.auth.verifyOtp(params))
  redirect(next)
}

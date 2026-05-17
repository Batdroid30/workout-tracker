'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function forgotPassword(formData: FormData) {
  const email = formData.get('email') as string
  if (!email) redirect('/forgot-password?error=Email+is+required')

  // NEXT_PUBLIC_SITE_URL is the authoritative source in production (set this in Vercel env vars).
  // Trailing slash stripped so redirectTo never becomes "https://app.vercel.app//reset-password".
  // Header-based derivation is the fallback for preview/local environments.
  const headersList = await headers()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  const origin = siteUrl ??
    (headersList.get('x-forwarded-host')
      ? `https://${headersList.get('x-forwarded-host')}`
      : headersList.get('origin') ?? 'http://localhost:3000')

  const supabase = await getSupabaseServer()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })

  // Always show success — don't reveal whether the email exists
  redirect('/forgot-password?sent=1')
}

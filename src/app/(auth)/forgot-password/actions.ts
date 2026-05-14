'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export async function forgotPassword(formData: FormData) {
  const email = formData.get('email') as string
  if (!email) redirect('/forgot-password?error=Email+is+required')

  // Derive origin from the incoming request — works correctly in every environment
  const headersList = await headers()
  const origin = headersList.get('origin') ??
    (headersList.get('x-forwarded-host')
      ? `https://${headersList.get('x-forwarded-host')}`
      : 'http://localhost:3000')

  const supabase = await getSupabaseServer()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/reset-password`,
  })

  // Always show success — don't reveal whether the email exists
  redirect('/forgot-password?sent=1')
}

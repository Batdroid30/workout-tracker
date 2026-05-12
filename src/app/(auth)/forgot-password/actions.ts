'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function forgotPassword(formData: FormData) {
  const email = formData.get('email') as string
  if (!email) redirect('/forgot-password?error=Email+is+required')

  const supabase = await getSupabaseServer()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

  // Always show success — don't reveal whether the email exists
  redirect('/forgot-password?sent=1')
}

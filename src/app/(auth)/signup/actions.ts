'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signupUser(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  
  if (!email || !password || !confirmPassword) {
    redirect('/signup?error=All fields are required')
  }

  if (password !== confirmPassword) {
    redirect('/signup?error=Passwords do not match')
  }

  const supabase = await getSupabaseServer()
  const { error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    redirect('/signup?error=' + encodeURIComponent(error.message))
  }

  // After signup, we might want to redirect to login with a special message
  // Or straight to dashboard if auto session creation works.
  redirect('/dashboard')
}

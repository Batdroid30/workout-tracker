'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { signIn } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'

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
  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (signUpError) {
    redirect('/signup?error=' + encodeURIComponent(signUpError.message))
  }

  // After successful signup, sign in with NextAuth to create session
  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/dashboard',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/login?error=Account created, please sign in')
    }
    throw error
  }
}

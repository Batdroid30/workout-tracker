'use server'

import { signIn } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AuthError } from 'next-auth'

export async function loginUser(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  if (!email || !password) {
    redirect('/login?error=Invalid email or password')
  }

  try {
    await signIn('credentials', {
      email,
      password,
      redirectTo: '/dashboard',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return redirect('/login?error=Invalid credentials')
        default:
          return redirect('/login?error=Something went wrong')
      }
    }
    throw error
  }
}

'use server'

import { getSupabaseServer } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function loginUser(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  
  if (!email || !password) {
    // Optionally we can return state and use `useActionState`, but for now we'll throw or return
    // Wait, redirecting back with error param might be easier without client code
    redirect('/login?error=Invalid email or password')
  }

  const supabase = await getSupabaseServer()
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message))
  }

  redirect('/dashboard')
}

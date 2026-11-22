'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Button, Input } from '@/components/ui'
import Link from 'next/link'
import { checkResetLink } from './check-reset-link'

type PageState = 'loading' | 'ready' | 'success' | 'error'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [pageState, setPageState] = useState<PageState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const supabase = getSupabaseClient()

    // Supabase automatically exchanges the #access_token hash fragment for a session.
    // We listen for PASSWORD_RECOVERY to know when it's ready.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPageState('ready')
      }
    })

    checkResetLink(supabase.auth).then(setPageState)

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const form = e.currentTarget
    const password = (form.elements.namedItem('password') as HTMLInputElement).value
    const confirm = (form.elements.namedItem('confirmPassword') as HTMLInputElement).value

    if (password !== confirm) {
      setError('Passwords do not match')
      setIsSubmitting(false)
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setIsSubmitting(false)
      return
    }

    const supabase = getSupabaseClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setIsSubmitting(false)
      return
    }

    await supabase.auth.signOut()
    setPageState('success')
    setTimeout(() => router.push('/login?message=Password+updated'), 2000)
  }

  if (pageState === 'loading') {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="mb-5">
          <h2 className="t-display-s">Verifying link…</h2>
          <p className="t-caption mt-1">Hang on while we validate your reset token.</p>
        </div>
        <div className="flex justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    )
  }

  if (pageState === 'success') {
    return (
      <div className="space-y-4">
        <div className="mb-5">
          <h2 className="t-display-s">Password updated</h2>
          <p className="t-caption mt-1">Redirecting you to sign in…</p>
        </div>
        <div className="p-3 bg-positive-soft text-positive text-xs font-medium rounded-control">
          Your password has been changed. You can now sign in with your new password.
        </div>
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="space-y-4">
        <div className="mb-5">
          <h2 className="t-display-s">This link didn’t work</h2>
          <p className="t-caption mt-1">It may have expired or already been used.</p>
        </div>
        <div className="p-3 bg-negative-soft text-negative text-xs font-medium rounded-control">
          Reset links work once, for an hour, in the browser you requested them from. On iPhone, request the link in Safari, not the home-screen app.
        </div>
        <p className="text-center text-xs mt-4 text-tertiary">
          <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
            Request a new link
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="mb-5">
        <h2 className="t-display-s">New password</h2>
        <p className="t-caption mt-1">Choose a strong password for your account.</p>
      </div>

      {error && (
        <div className="p-3 bg-negative-soft text-negative text-xs font-medium rounded-control">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="t-label block">New password</label>
        <Input type="password" name="password" placeholder="Min. 6 characters" required minLength={6} />
      </div>
      <div className="space-y-1.5">
        <label className="t-label block">Confirm password</label>
        <Input type="password" name="confirmPassword" placeholder="Repeat your password" required minLength={6} />
      </div>

      <Button type="submit" loading={isSubmitting} className="mt-6">
        {isSubmitting ? 'Updating…' : 'Update password'}
      </Button>
    </form>
  )
}

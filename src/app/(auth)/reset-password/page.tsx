'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'

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

    // Handle the case where the token is already exchanged by the time the listener fires
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setPageState('ready')
    })

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
          <div className="w-6 h-6 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
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
        <div className="p-3 bg-[var(--accent-soft)] border border-[var(--accent-line)] text-[var(--accent)] text-xs font-medium rounded-[var(--radius-inner)]">
          Your password has been changed. You can now sign in with your new password.
        </div>
      </div>
    )
  }

  if (pageState === 'error') {
    return (
      <div className="space-y-4">
        <div className="mb-5">
          <h2 className="t-display-s">Link expired</h2>
          <p className="t-caption mt-1">This reset link is no longer valid.</p>
        </div>
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-[var(--radius-inner)]">
          Reset links expire after 1 hour. Request a new one below.
        </div>
        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-faint)' }}>
          <Link href="/forgot-password" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
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
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-[var(--radius-inner)]">
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

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full min-h-[48px] flex items-center justify-center gap-2 rounded-[var(--radius-inner)] text-sm font-semibold transition-colors disabled:opacity-60"
        style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}
      >
        {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : 'Update Password'}
      </button>
    </form>
  )
}

import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { forgotPassword } from './actions'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ForgotPasswordPage({ searchParams }: Props) {
  const params = await searchParams
  const error = params?.error as string | undefined
  const sent = params?.sent === '1'

  if (sent) {
    return (
      <div className="space-y-4">
        <div className="mb-5">
          <h2 className="t-display-s">Check your email</h2>
          <p className="t-caption mt-1">Reset link sent if the account exists.</p>
        </div>
        <div className="p-3 bg-[var(--accent-soft)] border border-[var(--accent-line)] text-[var(--accent)] text-xs font-medium rounded-[var(--radius-inner)]">
          If <strong>{params?.email}</strong> has an account, you&apos;ll receive a password reset link shortly. Check your spam folder if it doesn&apos;t arrive.
        </div>
        <p className="text-center text-xs mt-4" style={{ color: 'var(--text-faint)' }}>
          <Link href="/login" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form action={forgotPassword} className="space-y-4">
      <div className="mb-5">
        <h2 className="t-display-s">Reset password</h2>
        <p className="t-caption mt-1">We&apos;ll send a reset link to your email.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-[var(--radius-inner)]">
          {decodeURIComponent(error)}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="t-label block">Email</label>
        <Input type="email" name="email" placeholder="you@example.com" required />
      </div>

      <SubmitButton type="submit" className="mt-6 w-full" pendingText="Sending...">
        Send Reset Link
      </SubmitButton>

      <p className="text-center text-xs mt-4" style={{ color: 'var(--text-faint)' }}>
        Remembered it?{' '}
        <Link href="/login" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
          Back to sign in
        </Link>
      </p>
    </form>
  )
}

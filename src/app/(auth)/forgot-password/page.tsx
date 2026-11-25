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
        <div className="p-3 bg-positive-soft text-positive text-sm rounded-control">
          If <strong>{params?.email}</strong> has an account, you&apos;ll receive a password reset link shortly. Check your spam folder if it doesn&apos;t arrive.
        </div>
        <p className="t-body-sm mt-4 text-center">
          <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">
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
        <div className="p-3 bg-negative-soft text-negative text-sm rounded-control">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="t-label block">Email</label>
        <Input id="email" type="email" name="email" autoComplete="email" placeholder="you@example.com" required />
      </div>

      <SubmitButton type="submit" className="mt-6 w-full" pendingText="Sending...">
        Send reset link
      </SubmitButton>

      <p className="t-body-sm mt-4 text-center">
        Remembered it?{' '}
        <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  )
}

import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { signupUser } from './actions'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function SignupPage({ searchParams }: Props) {
  const resolvedParams = await searchParams
  const error = resolvedParams?.error as string | undefined

  return (
    <form action={signupUser} className="space-y-4">
      <div className="mb-5">
        <h2 className="t-display-s">Create account</h2>
        <p className="t-caption mt-1">Start tracking. Start growing.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-[var(--radius-inner)]">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="t-label block">Email</label>
        <Input type="email" name="email" placeholder="you@example.com" required />
      </div>
      <div className="space-y-1.5">
        <label className="t-label block">Password</label>
        <Input type="password" name="password" placeholder="Create a password" required />
      </div>
      <div className="space-y-1.5">
        <label className="t-label block">Confirm Password</label>
        <Input type="password" name="confirmPassword" placeholder="Confirm password" required />
      </div>

      <SubmitButton type="submit" className="mt-6 w-full" pendingText="Creating Account...">Create Account</SubmitButton>

      <p className="text-center text-xs mt-4" style={{ color: 'var(--text-faint)' }}>
        Already have an account?{' '}
        <Link href="/login" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
          Sign in
        </Link>
      </p>
    </form>
  )
}

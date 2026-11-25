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
        <div className="p-3 bg-negative-soft text-negative text-sm rounded-control">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="t-label block">Email</label>
        <Input id="email" type="email" name="email" autoComplete="email" placeholder="you@example.com" required />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="t-label block">Password</label>
        <Input id="password" type="password" name="password" autoComplete="new-password" placeholder="Create a password" required />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="t-label block">Confirm password</label>
        <Input id="confirmPassword" type="password" name="confirmPassword" autoComplete="new-password" placeholder="Confirm password" required />
      </div>

      <SubmitButton type="submit" className="mt-6 w-full" pendingText="Creating account...">Create account</SubmitButton>

      <p className="t-body-sm mt-4 text-center">
        Already have an account?{' '}
        <Link href="/login" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}

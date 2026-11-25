import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { SubmitButton } from '@/components/ui/SubmitButton'
import { loginUser } from './actions'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LoginPage({ searchParams }: Props) {
  const resolvedParams = await searchParams
  const error = resolvedParams?.error as string | undefined
  const message = resolvedParams?.message as string | undefined

  return (
    <form action={loginUser} className="space-y-4">
      <div className="mb-5">
        <h2 className="t-display-s">Welcome back</h2>
        <p className="t-caption mt-1">Sign in to continue your journey.</p>
      </div>

      {message && (
        <div className="p-3 bg-positive-soft text-positive text-sm rounded-control">
          {message}
        </div>
      )}

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
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="t-label block">Password</label>
          <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Input id="password" type="password" name="password" autoComplete="current-password" placeholder="••••••••" required />
      </div>

      <SubmitButton type="submit" className="mt-6 w-full" pendingText="Signing in...">Sign in</SubmitButton>

      <p className="t-body-sm mt-4 text-center">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="inline-flex min-h-11 items-center font-semibold text-primary hover:underline">
          Sign up
        </Link>
      </p>
    </form>
  )
}

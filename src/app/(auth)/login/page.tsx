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

  return (
    <form action={loginUser} className="space-y-4">
      <div className="mb-5">
        <h2 className="text-xl font-black uppercase tracking-tight text-white">Welcome back</h2>
        <p className="text-[11px] text-[#4a5568] font-body mt-1">Sign in to continue your journey.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-xl">
          {error}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="block text-[10px] font-black text-[#adb4ce] uppercase tracking-[0.15em]">Email</label>
        <Input type="email" name="email" placeholder="you@example.com" required />
      </div>
      <div className="space-y-1.5">
        <label className="block text-[10px] font-black text-[#adb4ce] uppercase tracking-[0.15em]">Password</label>
        <Input type="password" name="password" placeholder="••••••••" required />
      </div>

      <SubmitButton type="submit" className="mt-6 w-full" pendingText="Signing in...">Sign In</SubmitButton>

      <p className="text-center text-xs text-[#4a5568] font-body mt-4">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-[#CCFF00] hover:underline font-black">
          Sign up
        </Link>
      </p>
    </form>
  )
}

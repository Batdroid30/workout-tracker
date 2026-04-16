import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { loginUser } from './actions'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LoginPage({ searchParams }: Props) {
  const resolvedParams = await searchParams
  const error = resolvedParams?.error as string | undefined

  return (
    <form action={loginUser} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-md">
          {error}
        </div>
      )}
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Email</label>
        <Input type="email" name="email" placeholder="you@example.com" required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-300">Password</label>
        <Input type="password" name="password" placeholder="••••••••" required />
      </div>
      
      <Button type="submit" className="mt-6 w-full">Sign In</Button>
      
      <p className="text-center text-sm text-zinc-500 mt-4">
        Don't have an account?{' '}
        <Link href="/signup" className="text-brand hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </form>
  )
}

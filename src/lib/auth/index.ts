import NextAuth from 'next-auth'
import { authConfig } from './config'
import { redirect } from 'next/navigation'

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig)

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/login')
  }
  return {
    session,
    userId: session.user.id,
    accessToken: (session as any).supabaseAccessToken as string | undefined
  }
}

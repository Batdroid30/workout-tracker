import NextAuth from 'next-auth'
import { authConfig } from './config'
import { redirect } from 'next/navigation'

export const { auth, handlers, signIn, signOut } = NextAuth(authConfig)

export async function requireAuth() {
  const session = await auth()
  
  const token = (session as any)?.supabaseAccessToken
  if (!session?.user?.id || !token) {
    redirect('/login')
  }

  return {
    session,
    userId: session.user.id,
    accessToken: token as string
  }
}

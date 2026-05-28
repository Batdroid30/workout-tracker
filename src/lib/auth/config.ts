import { SupabaseAdapter } from '@auth/supabase-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getSupabaseServer } from '@/lib/supabase/server'
import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  providers: [
    CredentialsProvider({
      credentials: {
        email: { type: 'email' },
        password: { type: 'password' },
      },
      async authorize(credentials) {
        const supabase = await getSupabaseServer()
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email as string,
          password: credentials.password as string,
        })
        if (error || !data.user || !data.session) return null
        return {
          id: data.user.id,
          email: data.user.email,
          supabaseAccessToken: data.session.access_token,
          supabaseRefreshToken: data.session.refresh_token,
          expiresAt: Date.now() + data.session.expires_in * 1000,
        }
      }
    })
  ],
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.supabaseAccessToken = (user as any).supabaseAccessToken
        token.supabaseRefreshToken = (user as any).supabaseRefreshToken
        token.expiresAt = (user as any).expiresAt
      }

      // If token is close to expiry, refresh it
      if (Date.now() < (token.expiresAt as number) - 60 * 1000) {
        return token
      }

      try {
        const supabase = await getSupabaseServer()
        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: token.supabaseRefreshToken as string,
        })

        if (error || !data.session) throw error

        return {
          ...token,
          supabaseAccessToken: data.session.access_token,
          supabaseRefreshToken: data.session.refresh_token,
          expiresAt: Date.now() + data.session.expires_in * 1000,
        }
      } catch (err) {
        console.error('Failed to refresh Supabase session token in JWT callback:', err)
        return { ...token, error: 'RefreshAccessTokenError' }
      }
    },
    async session({ session, token }) {
      if (token && session.user) {
        if (!token.supabaseAccessToken) {
          // Legacy session without a Supabase token. Invalidate it to force a re-login.
          return {} as any
        }
        session.user.id = token.id as string
        (session as any).supabaseAccessToken = token.supabaseAccessToken
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  trustHost: true,
} satisfies NextAuthConfig

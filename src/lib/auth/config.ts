import { SupabaseAdapter } from '@auth/supabase-adapter'
import CredentialsProvider from 'next-auth/providers/credentials'
import { getSupabaseServer } from '@/lib/supabase/server'
import type { NextAuthConfig } from 'next-auth'

// In-memory cache to prevent concurrent refresh requests for the same token
// This stops parallel requests during SSR from failing due to single-use refresh tokens
const pendingRefreshes = new Map<string, Promise<any>>()

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
  session: { 
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
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
        const refreshToken = token.supabaseRefreshToken as string
        
        // If a refresh is already in progress for this token, await its result instead of triggering a new one
        if (!pendingRefreshes.has(refreshToken)) {
          const refreshPromise = (async () => {
            const supabase = await getSupabaseServer()
            const { data, error } = await supabase.auth.refreshSession({
              refresh_token: refreshToken,
            })
            if (error || !data.session) throw error
            return data.session
          })()
          
          pendingRefreshes.set(refreshToken, refreshPromise)
          // Clean up the promise from the map once it resolves or rejects
          refreshPromise.finally(() => pendingRefreshes.delete(refreshToken))
        }

        const sessionData = await pendingRefreshes.get(refreshToken)

        return {
          ...token,
          supabaseAccessToken: sessionData.access_token,
          supabaseRefreshToken: sessionData.refresh_token,
          expiresAt: Date.now() + sessionData.expires_in * 1000,
        }
      } catch (err) {
        console.error('Failed to refresh Supabase session token in JWT callback:', err)
        return { ...token, error: 'RefreshAccessTokenError' }
      }
    },
    async session({ session, token }) {
      if (token && session.user) {
        if (!token.supabaseAccessToken || token.error === 'RefreshAccessTokenError') {
          // Legacy session without a Supabase token, or expired token that failed to refresh. 
          // Invalidate it to force a re-login.
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

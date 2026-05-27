import NextAuth, { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    supabaseAccessToken?: string
    user: {
      id: string
    } & DefaultSession['user']
  }

  interface User {
    supabaseAccessToken?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    supabaseAccessToken?: string
  }
}

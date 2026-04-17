import { auth } from '@/lib/auth'
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export default auth(async (req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  // 1. Handle Supabase Session Refreshing
  // We do this to keep the GoTrue session (used for data fetching) in sync with NextAuth
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          req.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // This refreshes the session if needed
  await supabase.auth.getSession()

  // 2. Route Protection Logic
  const isAuthPage = nextUrl.pathname === '/login' || nextUrl.pathname === '/signup'
  const isAppPage = nextUrl.pathname.startsWith('/dashboard') || 
                   nextUrl.pathname.startsWith('/exercises') || 
                   nextUrl.pathname.startsWith('/workout') || 
                   nextUrl.pathname.startsWith('/progress')

  if (isAppPage && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return response
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

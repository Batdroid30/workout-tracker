import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  // NextAuth populates req.auth from its own JWT cookie — this is the
  // single source of truth for whether the user is logged in.
  const isLoggedIn = !!req.auth

  const isAuthPage = nextUrl.pathname === '/login' || nextUrl.pathname === '/signup'
  const isPublicFile = nextUrl.pathname.includes('.')

  // Unauthenticated user hitting a protected route → send to login
  if (!isLoggedIn && !isAuthPage && !isPublicFile) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Authenticated user hitting login/signup → send to dashboard
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

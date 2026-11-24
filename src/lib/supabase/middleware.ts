import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { routeAccess } from './route-access'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This will refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const { data: { user } } = await supabase.auth.getUser()

  // A redirect is a new response, so it must carry the session cookies Supabase
  // just wrote. Without them a dead session is never cleared and every request
  // retries it (Supabase's Next.js guide calls this out).
  const redirectTo = (path: string) => {
    const redirect = NextResponse.redirect(new URL(path, request.url))
    supabaseResponse.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie))
    return redirect
  }

  const access = routeAccess(request.nextUrl.pathname)

  if (access === 'auth' && user) return redirectTo('/dashboard')
  if (access === 'app' && !user) return redirectTo('/login')

  return supabaseResponse
}

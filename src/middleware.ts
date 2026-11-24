import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Let updateSession handle the auth refresh and route protection
  return await updateSession(request)
}

// Static files never need a session check: each check can refresh the session,
// and a page pulls in several of these at once.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}

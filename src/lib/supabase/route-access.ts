export type RouteAccess = 'auth' | 'public' | 'app'

// Sign-in pages: a signed-in visitor is sent on to the app.
const AUTH_ROUTES = ['/login', '/signup']

// Open to everyone. The reset pages serve people who can't sign in, and the
// manifest and icons are fetched by the browser without a session.
const PUBLIC_ROUTES = ['/forgot-password', '/reset-password', '/manifest.json', '/icons/']

function matches(pathname: string, route: string): boolean {
  if (route.endsWith('/')) return pathname.startsWith(route)
  return pathname === route || pathname.startsWith(`${route}/`)
}

export function routeAccess(pathname: string): RouteAccess {
  if (AUTH_ROUTES.some(route => matches(pathname, route))) return 'auth'
  if (pathname === '/' || PUBLIC_ROUTES.some(route => matches(pathname, route))) return 'public'
  return 'app'
}

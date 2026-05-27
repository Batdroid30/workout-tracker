import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'
import { UnauthorizedError } from '@/lib/errors'

export async function resolveSupabaseClient(accessToken?: string, runAsAdmin: boolean = false) {
  if (accessToken) return await getSupabaseServer(accessToken)
  if (runAsAdmin) return getSupabaseAdmin()
  throw new UnauthorizedError('Unauthorized: No access token provided and runAsAdmin is not explicitly set to true.')
}

export async function getSupabaseServer(accessToken?: string) {
  const cookieStore = await cookies()
  const headers: Record<string, string> = {}
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: accessToken ? { headers } : undefined,
      cookies: {
        get: (name) => cookieStore.get(name)?.value,
        set: (name, value, options) => {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {}
        },
        remove: (name, options) => {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {}
        },
      },
    }
  )
}

// Singleton — the admin client carries no user session state (always uses the
// service role key), so one instance is safe to share across all server requests.
let adminClient: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }
  return adminClient
}

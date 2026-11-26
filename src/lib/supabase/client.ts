import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

// Singleton pattern — one client instance for the whole app
let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return client
}

// The signed-in user's id from the stored session: no call to the Auth
// server, and it still works offline mid-workout. Fine in the browser, where
// it only scopes queries that RLS checks against the JWT anyway. On the
// server use requireAuth(), which verifies the token.
export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await getSupabaseClient().auth.getSession()
  return data.session?.user.id ?? null
}

/**
 * Server-side in-memory TTL cache for `buildUserTrainingContext`.
 *
 * The context snapshot is derived from 10+ Supabase queries and takes ~300-500ms
 * to compute. Caching it per-user for 5 minutes avoids redundant DB reads when
 * a user sends multiple messages in quick succession, saving ~700-1000 input
 * tokens of re-fetch overhead on each call.
 */

interface CacheEntry {
  context: string
  expiresAt: number
}

// Module-level map lives for the lifetime of the server process.
// Safe for serverless because Next.js route handlers share the module cache
// within a single worker invocation window.
const contextCache = new Map<string, CacheEntry>()

const TTL_MS = 5 * 60 * 1000 // 5 minutes

export function getCachedContext(userId: string): string | null {
  const entry = contextCache.get(userId)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    contextCache.delete(userId)
    return null
  }
  return entry.context
}

export function setCachedContext(userId: string, context: string): void {
  contextCache.set(userId, { context, expiresAt: Date.now() + TTL_MS })
}

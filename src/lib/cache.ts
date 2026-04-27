import { revalidatePath } from 'next/cache'

/**
 * Invalidates every route in the app.
 *
 * Call this after any mutation (save workout, delete, update profile, etc.).
 * revalidatePath('/', 'layout') walks down from the root layout and busts
 * every cached RSC payload under it — no list of paths to maintain.
 *
 * Data functions use React cache() for per-request deduplication only,
 * so there are no persistent data cache tags to manage here.
 */
export function revalidateAll() {
  revalidatePath('/', 'layout')
}

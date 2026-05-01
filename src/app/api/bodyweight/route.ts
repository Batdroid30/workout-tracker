import { z } from 'zod'
import { auth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'

// ── Input validation ─────────────────────────────────────────────────────────

const LogBodyweightSchema = z.object({
  weight_kg: z.number().positive().max(500),
  /** ISO 8601 datetime. Defaults to now() when omitted. */
  logged_at: z.string().datetime().optional(),
})

// ── POST /api/bodyweight — log a new reading ─────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body) {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const result = LogBodyweightSchema.safeParse(body)
  if (!result.success) {
    return Response.json(
      { error: 'Validation failed', details: result.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase
      .from('bodyweight_log')
      .insert({
        user_id:   session.user.id,
        weight_kg: result.data.weight_kg,
        logged_at: result.data.logged_at ?? new Date().toISOString(),
      })
      .select('id, weight_kg, logged_at')
      .single()

    if (error) throw new DatabaseError(error.message, error)

    return Response.json(data, { status: 201 })

  } catch (error) {
    if (error instanceof DatabaseError) {
      return Response.json({ error: 'Database error' }, { status: 503 })
    }
    console.error('Unexpected error in POST /api/bodyweight:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

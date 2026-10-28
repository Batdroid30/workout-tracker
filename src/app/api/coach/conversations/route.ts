import { z } from 'zod'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getConversations, createConversation } from '@/lib/data/coach'

const CreateConversationSchema = z.object({
  title: z.string().min(1).max(60).optional(),
})

export async function GET() {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const conversations = await getConversations(user.id)
    return Response.json(conversations)
  } catch (err: unknown) {
    console.error('Error fetching conversations:', err)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const parsed = CreateConversationSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: 'Invalid input' }, { status: 400 })
    }

    const newConv = await createConversation(user.id, parsed.data.title)
    return Response.json(newConv, { status: 201 })
  } catch (err: unknown) {
    console.error('Error creating conversation:', err)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

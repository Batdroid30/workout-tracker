import { getSupabaseServer } from '@/lib/supabase/server'
import {
  getConversationById,
  getConversationMessages,
  deleteConversation,
} from '@/lib/data/coach'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(req: Request, context: RouteContext) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const conversation = await getConversationById(id, user.id)

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const messages = await getConversationMessages(id, 60)

    return Response.json({ conversation, messages })
  } catch (err: unknown) {
    console.error('Error fetching conversation detail:', err)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const supabase = await getSupabaseServer()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    await deleteConversation(id, user.id)

    return Response.json({ success: true })
  } catch (err: unknown) {
    console.error('Error deleting conversation:', err)
    return Response.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

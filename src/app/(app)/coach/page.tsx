import { requireAuth } from '@/lib/auth'
import { getConversations, getConversationMessages } from '@/lib/data/coach'
import { CoachChatView } from '@/components/coach/CoachChatView'

export const metadata = {
  title: 'AI Coach | Workout Tracker',
  description: 'Evidence-based AI strength & conditioning coach',
}

interface CoachPageProps {
  searchParams: Promise<{ prompt?: string }>
}

export default async function CoachPage({ searchParams }: CoachPageProps) {
  const { userId } = await requireAuth()
  const { prompt } = await searchParams

  // Restore the latest conversation if one exists
  const conversations = await getConversations(userId)
  const latestConv = conversations.length > 0 ? conversations[0] : null

  // If a deep-link prompt is provided, always start a fresh conversation
  // so the pre-filled message isn't appended to an existing unrelated chat.
  const initialConvId = prompt ? undefined : latestConv?.id

  const initialMessages =
    !prompt && latestConv
      ? await getConversationMessages(latestConv.id, 40)
      : []

  // Decode the URL-encoded prompt (router already decodes, but guard against double-encoding)
  const initialPrompt = prompt ? decodeURIComponent(prompt) : undefined

  return (
    <CoachChatView
      initialConversationId={initialConvId}
      initialMessages={initialMessages}
      initialPrompt={initialPrompt}
    />
  )
}

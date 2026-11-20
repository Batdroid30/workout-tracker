import { requireAuth } from '@/lib/auth'
import { getConversations, getConversationMessages } from '@/lib/data/coach'
import { CoachChatView } from '@/components/coach/CoachChatView'
import { readCoachPrompt } from '@/lib/coach/read-coach-prompt'

export const metadata = {
  title: 'AI Coach | Workout Tracker',
  description: 'Evidence-based AI strength & conditioning coach',
}

interface CoachPageProps {
  searchParams: Promise<{ prompt?: string | string[] }>
}

export default async function CoachPage({ searchParams }: CoachPageProps) {
  const { userId } = await requireAuth()
  const prompt = readCoachPrompt((await searchParams).prompt)

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

  return (
    <CoachChatView
      initialConversationId={initialConvId}
      initialMessages={initialMessages}
      initialPrompt={prompt}
    />
  )
}

import { requireAuth } from '@/lib/auth'
import { getConversations } from '@/lib/data/coach'
import { getCoachSignals } from '@/lib/data/coach-signals'
import { CoachChatView } from '@/components/coach/CoachChatView'
import { readCoachPrompt } from '@/lib/coach/read-coach-prompt'
import { chatWhen } from '@/lib/coach/chat-when'
import { pickCoachNotes } from '@/lib/home'

export const metadata = {
  title: 'Coach | Lifts',
  description: 'What your coach noticed this week, and a chat to ask about it.',
}

const RECENT_CHAT_COUNT = 3

interface CoachPageProps {
  searchParams: Promise<{ prompt?: string | string[] }>
}

export default async function CoachPage({ searchParams }: CoachPageProps) {
  const { userId } = await requireAuth()
  const prompt = readCoachPrompt((await searchParams).prompt)

  // A deep link starts a fresh chat with its question, straight away.
  if (prompt) return <CoachChatView initialPrompt={prompt} />

  // Otherwise Coach opens on what it noticed this week, then recent chats.
  const [signals, conversations] = await Promise.all([getCoachSignals(userId), getConversations(userId)])
  const now = new Date()
  const recentChats = conversations.slice(0, RECENT_CHAT_COUNT).map(conversation => ({
    id: conversation.id,
    title: conversation.title,
    when: chatWhen(conversation.updated_at, now),
  }))

  return <CoachChatView notes={pickCoachNotes(signals.input)} recentChats={recentChats} />
}

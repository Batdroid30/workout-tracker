import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getConversationById, getConversationMessages } from '@/lib/data/coach'
import { CoachChatView } from '@/components/coach/CoachChatView'

interface CoachConversationPageProps {
  params: Promise<{ id: string }>
}

export default async function CoachConversationPage({ params }: CoachConversationPageProps) {
  const { userId } = await requireAuth()
  const { id } = await params

  const conversation = await getConversationById(id, userId)
  if (!conversation) {
    notFound()
  }

  const messages = await getConversationMessages(id, 60)

  return (
    <CoachChatView
      initialConversationId={id}
      initialMessages={messages}
    />
  )
}

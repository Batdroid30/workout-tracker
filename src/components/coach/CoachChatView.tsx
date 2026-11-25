'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { useCoachChat } from '@/hooks/useCoachChat'
import { CoachMessageBubble } from './CoachMessageBubble'
import { CoachInput } from './CoachInput'
import { CoachHistoryDrawer } from './CoachHistoryDrawer'
import { CoachHome, type RecentChat } from './CoachHome'
import { CoachChatTopBar } from './CoachChatTopBar'
import type { CoachMessage } from '@/types/coach'
import type { CoachNote } from '@/lib/home'

const CHAT_TITLE_LENGTH = 40

interface CoachChatViewProps {
  initialConversationId?: string
  initialMessages?: CoachMessage[]
  /** Pre-filled prompt sent automatically on mount (from deep-links). */
  initialPrompt?: string
  /** What the coach noticed this week; loaded only on the plain /coach page. */
  notes?: CoachNote[]
  recentChats?: RecentChat[]
}

function chatTitle(messages: CoachMessage[]): string {
  const first = messages.find(message => message.role === 'user')?.content.trim()
  if (!first) return 'New chat'
  return first.length > CHAT_TITLE_LENGTH ? `${first.slice(0, CHAT_TITLE_LENGTH)}…` : first
}

export function CoachChatView({
  initialConversationId,
  initialMessages = [],
  initialPrompt,
  notes = [],
  recentChats = [],
}: CoachChatViewProps) {
  const router = useRouter()
  const {
    conversationId,
    messages,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    resetChat,
    loadConversation,
  } = useCoachChat({
    initialConversationId,
    initialMessages,
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  // Track whether we've already auto-sent the initial prompt
  const promptSentRef = useRef(false)

  // Auto-scroll on new message chunks
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-send deep-link prompt once on mount
  useEffect(() => {
    if (initialPrompt && !promptSentRef.current) {
      promptSentRef.current = true
      sendMessage(initialPrompt)
    }
  }, [initialPrompt, sendMessage])

  // The notes are only loaded on plain /coach. From a past conversation or a
  // deep link, going back means loading that page.
  const backToNotes = () => {
    resetChat()
    if (window.location.pathname !== '/coach' || window.location.search) router.push('/coach')
  }

  const isChatting = messages.length > 0

  return (
    <div
      className="flex flex-col max-w-2xl mx-auto"
      style={{
        height: 'calc(100dvh - max(7rem, calc(5.75rem + env(safe-area-inset-bottom, 0px))))',
      }}
    >
      {isChatting && <CoachChatTopBar title={chatTitle(messages)} onBack={backToNotes} onNewChat={backToNotes} />}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isChatting ? (
          messages.map(msg => <CoachMessageBubble key={msg.id} message={msg} />)
        ) : (
          <CoachHome notes={notes} recentChats={recentChats} onAsk={sendMessage} onOpenHistory={() => setHistoryOpen(true)} />
        )}

        {error && (
          <div className="flex items-center gap-2 rounded-control bg-negative-soft p-3 text-sm text-negative">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} className="h-4" />
      </div>

      <div className="p-3 shrink-0 bg-bg">
        <CoachInput
          onSend={sendMessage}
          onStop={stopStreaming}
          isStreaming={isStreaming}
        />
      </div>

      <CoachHistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        currentConversationId={conversationId}
        onSelectConversation={loadConversation}
        onNewChat={backToNotes}
      />
    </div>
  )
}

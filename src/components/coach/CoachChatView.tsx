'use client'

import { useRef, useEffect, useState } from 'react'
import { Plus, Sparkles, AlertCircle, History } from 'lucide-react'
import { Chip } from '@/components/ui'
import { useCoachChat } from '@/hooks/useCoachChat'
import { CoachMessageBubble } from './CoachMessageBubble'
import { CoachEmptyState } from './CoachEmptyState'
import { CoachInput } from './CoachInput'
import { CoachHistoryDrawer } from './CoachHistoryDrawer'
import type { CoachMessage } from '@/types/coach'

interface CoachChatViewProps {
  initialConversationId?: string
  initialMessages?: CoachMessage[]
  /** Pre-filled prompt sent automatically on mount (from deep-links). */
  initialPrompt?: string
}

export function CoachChatView({
  initialConversationId,
  initialMessages = [],
  initialPrompt,
}: CoachChatViewProps) {
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

  return (
    <div
      className="flex flex-col max-w-2xl mx-auto"
      style={{
        height: 'calc(100dvh - max(7rem, calc(5.75rem + env(safe-area-inset-bottom, 0px))))',
      }}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 shrink-0 bg-bg sticky top-0 z-10">
        <div className="flex min-w-0 items-center gap-2">
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-surface-raised text-secondary">
            <Sparkles className="h-4 w-4" />
            <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-positive ring-2 ring-bg" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-primary flex items-center gap-1.5">
              AI Coach
              <Chip>PRO</Chip>
            </h1>
            <p className="truncate text-xs text-tertiary">Live science &amp; routine engine</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* History drawer toggle */}
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="focus-ring flex min-h-10 items-center gap-1.5 rounded-pill border border-border-strong bg-surface-raised px-3 text-xs font-medium text-primary transition-colors active:scale-95"
            aria-label="Open chat history"
          >
            <History className="h-3.5 w-3.5" />
            <span>History</span>
          </button>

          {/* New chat */}
          <button
            type="button"
            onClick={resetChat}
            className="focus-ring flex min-h-10 items-center gap-1.5 rounded-pill border border-border-strong bg-surface-raised px-3 text-xs font-medium text-primary transition-colors active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <CoachEmptyState onSelectPrompt={sendMessage} />
        ) : (
          messages.map(msg => (
            <CoachMessageBubble key={msg.id} message={msg} />
          ))
        )}

        {/* Error notification */}
        {error && (
          <div className="flex items-center gap-2 rounded-control bg-negative-soft p-3 text-xs text-negative">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="p-3 shrink-0 bg-bg">
        <CoachInput
          onSend={sendMessage}
          onStop={stopStreaming}
          isStreaming={isStreaming}
        />
      </div>

      {/* Conversation History Drawer */}
      <CoachHistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        currentConversationId={conversationId}
        onSelectConversation={loadConversation}
        onNewChat={resetChat}
      />
    </div>
  )
}

'use client'

import { useRef, useEffect, useState } from 'react'
import { Plus, Sparkles, AlertCircle, History } from 'lucide-react'
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
        height: 'calc(100dvh - max(6.75rem, calc(5rem + env(safe-area-inset-bottom, 0px))))',
      }}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3 shrink-0 backdrop-blur-md bg-zinc-950/60 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
            <Sparkles className="h-4 w-4" />
            <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full bg-teal-400 ring-2 ring-zinc-950" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
              AI Coach
              <span className="rounded bg-teal-500/10 px-1.5 py-0.2 text-[10px] font-mono text-teal-400 border border-teal-500/20">
                PRO
              </span>
            </h1>
            <p className="text-[11px] text-zinc-500">Live Science &amp; Routine Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* History drawer toggle */}
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white active:scale-95"
            aria-label="Open chat history"
          >
            <History className="h-3.5 w-3.5" />
            <span>History</span>
          </button>

          {/* New chat */}
          <button
            type="button"
            onClick={resetChat}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white active:scale-95"
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
          <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-950/30 p-3 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input Area */}
      <div className="p-3 shrink-0 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent">
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

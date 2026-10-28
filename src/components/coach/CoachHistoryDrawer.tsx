'use client'

import { useCallback, useEffect, useState } from 'react'
import { History, MessageSquare, Trash2, Sparkles } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import type { CoachConversation } from '@/types/coach'

interface CoachHistoryDrawerProps {
  isOpen: boolean
  onClose: () => void
  currentConversationId: string | null
  onSelectConversation: (id: string) => void
  onNewChat: () => void
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function CoachHistoryDrawer({
  isOpen,
  onClose,
  currentConversationId,
  onSelectConversation,
  onNewChat,
}: CoachHistoryDrawerProps) {
  const [conversations, setConversations] = useState<CoachConversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchConversations = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/coach/conversations')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setConversations(data.conversations ?? [])
    } catch {
      // silently degrade — list stays empty
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Refresh list each time the drawer opens
  useEffect(() => {
    if (isOpen) fetchConversations()
  }, [isOpen, fetchConversations])

  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation()
      setDeletingId(id)
      try {
        await fetch(`/api/coach/conversations/${id}`, { method: 'DELETE' })
        setConversations(prev => prev.filter(c => c.id !== id))
        // If we deleted the active conversation, start fresh
        if (id === currentConversationId) {
          onNewChat()
          onClose()
        }
      } catch {
        // silently degrade
      } finally {
        setDeletingId(null)
      }
    },
    [currentConversationId, onNewChat, onClose]
  )

  const handleSelect = useCallback(
    (id: string) => {
      onSelectConversation(id)
      onClose()
    },
    [onSelectConversation, onClose]
  )

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Chat History"
      icon={<History className="h-4 w-4 text-teal-400" />}
    >
      {/* New Chat shortcut */}
      <button
        type="button"
        onClick={() => { onNewChat(); onClose() }}
        className="flex w-full items-center gap-3 rounded-xl border border-teal-500/20 bg-teal-500/5 px-4 py-3 text-sm text-teal-400 transition-colors hover:bg-teal-500/10 active:scale-[0.98] mb-4"
      >
        <Sparkles className="h-4 w-4 shrink-0" />
        <span className="font-medium">New conversation</span>
      </button>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 rounded-xl bg-zinc-800/60 animate-pulse" />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <MessageSquare className="h-8 w-8 text-zinc-600" />
          <p className="text-sm text-zinc-500">No past conversations yet</p>
          <p className="text-xs text-zinc-600">Your chats with Coach will appear here</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {conversations.map(conv => {
            const isActive = conv.id === currentConversationId
            return (
              <li key={conv.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(conv.id)}
                  className="group flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors active:scale-[0.98]"
                  style={{
                    borderColor: isActive ? 'rgba(45,212,191,0.3)' : 'var(--glass-border)',
                    background: isActive ? 'rgba(45,212,191,0.06)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <MessageSquare
                    className="h-4 w-4 shrink-0"
                    style={{ color: isActive ? 'var(--accent)' : 'var(--text-faint)' }}
                  />

                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-[13px] font-medium"
                      style={{ color: isActive ? 'var(--accent)' : 'var(--text-hi)' }}
                    >
                      {conv.title || 'Untitled Chat'}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                      {formatRelativeTime(conv.updated_at)}
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label="Delete conversation"
                    onClick={e => handleDelete(e, conv.id)}
                    disabled={deletingId === conv.id}
                    className="shrink-0 rounded-lg p-1.5 text-zinc-600 opacity-0 transition-opacity hover:text-red-400 group-hover:opacity-100 disabled:animate-pulse"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </BottomSheet>
  )
}

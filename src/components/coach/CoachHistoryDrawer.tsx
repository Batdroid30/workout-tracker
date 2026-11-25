'use client'

import { useCallback, useEffect, useState } from 'react'
import { History, MessageSquare, Trash2, Plus } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button, IconButton, Skeleton } from '@/components/ui'
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
      title="Chat history"
      icon={<History className="h-4 w-4 text-secondary" />}
    >
      {/* New Chat shortcut */}
      <Button variant="secondary" className="mb-4" onClick={() => { onNewChat(); onClose() }}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        New chat
      </Button>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-16 rounded-control" />
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <MessageSquare className="h-8 w-8 text-tertiary" />
          <p className="t-body-sm">No past chats yet</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {conversations.map(conv => {
            const isActive = conv.id === currentConversationId
            return (
              <li
                key={conv.id}
                className={`flex items-center gap-1 rounded-control border pr-1 ${isActive ? 'border-border-strong bg-surface-raised' : 'border-border bg-surface'}`}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(conv.id)}
                  className="focus-ring flex min-h-14 min-w-0 flex-1 items-center gap-3 px-4 py-2 text-left"
                >
                  <MessageSquare className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-tertiary'}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="t-body block truncate">{conv.title || 'New chat'}</span>
                    <span className="t-caption block">{formatRelativeTime(conv.updated_at)}</span>
                  </span>
                </button>
                <IconButton
                  aria-label="Delete chat"
                  onClick={e => handleDelete(e, conv.id)}
                  disabled={deletingId === conv.id}
                  className="shrink-0 hover:text-negative"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </IconButton>
              </li>
            )
          })}
        </ul>
      )}
    </BottomSheet>
  )
}

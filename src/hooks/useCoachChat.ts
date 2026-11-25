'use client'

import { useState, useCallback, useRef } from 'react'
import type { CoachMessage, CoachStreamEvent, ProposedRoutine } from '@/types/coach'
import type { CoachProposal } from '@/lib/coach/proposals'

interface UseCoachChatOptions {
  initialConversationId?: string
  initialMessages?: CoachMessage[]
}

export function useCoachChat({
  initialConversationId,
  initialMessages = [],
}: UseCoachChatOptions = {}) {
  const [conversationId, setConversationId] = useState<string | null>(
    initialConversationId ?? null
  )
  const [messages, setMessages] = useState<CoachMessage[]>(initialMessages)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return

      setError(null)

      // Optimistic user message
      const tempUserMsgId = `temp-user-${Date.now()}`
      const userMessage: CoachMessage = {
        id: tempUserMsgId,
        conversation_id: conversationId || '',
        role: 'user',
        content: text.trim(),
        metadata: null,
        created_at: new Date().toISOString(),
      }

      // Optimistic assistant placeholder
      const tempAssistantMsgId = `temp-asst-${Date.now()}`
      const assistantMessage: CoachMessage = {
        id: tempAssistantMsgId,
        conversation_id: conversationId || '',
        role: 'assistant',
        content: '',
        metadata: null,
        created_at: new Date().toISOString(),
      }

      setMessages(prev => [...prev, userMessage, assistantMessage])
      setIsStreaming(true)

      abortControllerRef.current = new AbortController()

      try {
        const response = await fetch('/api/coach/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversationId: conversationId || undefined,
            message: text.trim(),
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}))
          throw new Error(errData.error || `HTTP error ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) throw new Error('Response body is not readable')

        const decoder = new TextDecoder()
        let accumulatedText = ''
        let currentProposedRoutine: ProposedRoutine | undefined
        let activeConvId = conversationId

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const rawData = line.slice(6).trim()
              if (!rawData) continue

              try {
                const event: CoachStreamEvent = JSON.parse(rawData)

                if (event.type === 'text_delta') {
                  accumulatedText += event.text
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === tempAssistantMsgId
                        ? { ...m, content: accumulatedText }
                        : m
                    )
                  )
                } else if (event.type === 'routine_proposed') {
                  currentProposedRoutine = event.routine
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === tempAssistantMsgId
                        ? {
                            ...m,
                            metadata: {
                              ...m.metadata,
                              proposed_routine: currentProposedRoutine,
                            },
                          }
                        : m
                    )
                  )
                } else if (event.type === 'proposal') {
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === tempAssistantMsgId
                        ? {
                            ...m,
                            metadata: {
                              ...m.metadata,
                              proposals: [...(m.metadata?.proposals ?? []), event.proposal],
                            },
                          }
                        : m
                    )
                  )
                } else if (event.type === 'message_complete') {
                  activeConvId = event.conversation_id
                  setConversationId(event.conversation_id)
                  setMessages(prev =>
                    prev.map(m =>
                      m.id === tempAssistantMsgId
                        ? {
                            ...m,
                            id: event.message_id,
                            conversation_id: event.conversation_id,
                          }
                        : m.id === tempUserMsgId
                        ? { ...m, conversation_id: event.conversation_id }
                        : m
                    )
                  )
                } else if (event.type === 'error') {
                  setError(event.message)
                }
              } catch (parseErr) {
                console.warn('Failed to parse SSE event:', parseErr)
              }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // aborted intentionally
          return
        }
        const errMsg = err instanceof Error ? err.message : 'Failed to send message'
        setError(errMsg)
        // Clean up assistant message placeholder if empty
        setMessages(prev =>
          prev.map(m =>
            m.id === tempAssistantMsgId
              ? { ...m, content: `⚠️ ${errMsg}` }
              : m
          )
        )
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
      }
    },
    [conversationId, isStreaming]
  )

  const setProposalStatus = useCallback(
    (messageId: string, proposalId: string, status: CoachProposal['status']) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId && m.metadata?.proposals
            ? {
                ...m,
                metadata: {
                  ...m.metadata,
                  proposals: m.metadata.proposals.map(p => (p.id === proposalId ? { ...p, status } : p)),
                },
              }
            : m
        )
      )
    },
    []
  )

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsStreaming(false)
    }
  }, [])

  const resetChat = useCallback(() => {
    stopStreaming()
    setConversationId(null)
    setMessages([])
    setError(null)
  }, [stopStreaming])

  const loadConversation = useCallback(
    async (id: string) => {
      stopStreaming()
      setError(null)
      try {
        const res = await fetch(`/api/coach/conversations/${id}`)
        if (!res.ok) throw new Error('Failed to load conversation')
        const data = await res.json()
        setConversationId(id)
        setMessages(data.messages || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading conversation')
      }
    },
    [stopStreaming]
  )

  return {
    conversationId,
    messages,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    resetChat,
    loadConversation,
    setProposalStatus,
  }
}

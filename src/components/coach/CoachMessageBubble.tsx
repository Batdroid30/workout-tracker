import { Bot, User } from 'lucide-react'
import { CoachRoutineCard } from './CoachRoutineCard'
import type { CoachMessage } from '@/types/coach'

interface CoachMessageBubbleProps {
  message: CoachMessage
}

export function CoachMessageBubble({ message }: CoachMessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex w-full gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
          <Bot className="h-4 w-4" />
        </div>
      )}

      <div
        className={`relative max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-teal-600 text-white rounded-br-xs'
            : 'bg-zinc-900 border border-zinc-800/80 text-zinc-200 rounded-bl-xs'
        }`}
      >
        <div className="whitespace-pre-wrap break-words">
          {formatMessageContent(message.content)}
        </div>

        {/* Embedded routine proposal card */}
        {message.metadata?.proposed_routine && (
          <CoachRoutineCard
            routine={message.metadata.proposed_routine}
            savedRoutineId={message.metadata.saved_routine_id}
          />
        )}
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl bg-zinc-800 text-zinc-300">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  )
}

/**
 * Basic markdown-style parser for bold, code, and bullet lists without bulky external deps
 */
function formatMessageContent(content: string) {
  if (!content) {
    return (
      <span className="inline-flex items-center gap-1 text-zinc-500">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-400" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-400 [animation-delay:0.2s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-400 [animation-delay:0.4s]" />
      </span>
    )
  }

  const parts = content.split(/(\*\*.*?\*\*|`.*?`)/g)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="rounded bg-zinc-950/60 px-1.5 py-0.5 font-mono text-xs text-teal-300 border border-zinc-800"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

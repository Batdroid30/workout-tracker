import { CoachRoutineCard } from './CoachRoutineCard'
import type { CoachMessage } from '@/types/coach'

interface CoachMessageBubbleProps {
  message: CoachMessage
}

export function CoachMessageBubble({ message }: CoachMessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>

      <div
        className={`relative text-base leading-relaxed text-primary ${
          isUser
            ? 'max-w-[80%] rounded-card rounded-br-xs bg-surface-raised px-4 py-2.5'
            : 'max-w-[92%] py-1'
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

    </div>
  )
}

/**
 * Basic markdown-style parser for bold, code, and bullet lists without bulky external deps
 */
function formatMessageContent(content: string) {
  if (!content) {
    return (
      <span className="inline-flex items-center gap-1 text-tertiary">
        <span className="h-1.5 w-1.5 motion-safe:animate-bounce rounded-full bg-tertiary" />
        <span className="h-1.5 w-1.5 motion-safe:animate-bounce rounded-full bg-tertiary [animation-delay:0.2s]" />
        <span className="h-1.5 w-1.5 motion-safe:animate-bounce rounded-full bg-tertiary [animation-delay:0.4s]" />
      </span>
    )
  }

  const parts = content.split(/(\*\*.*?\*\*|`.*?`)/g)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-semibold text-primary">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={index}
          className="rounded bg-surface-raised px-1.5 py-0.5 mono text-xs text-primary border border-border"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

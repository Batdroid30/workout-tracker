import { ChevronLeft, Plus } from 'lucide-react'
import { IconButton } from '@/components/ui'

interface CoachChatTopBarProps {
  title: string
  onBack: () => void
  onNewChat: () => void
}

export function CoachChatTopBar({ title, onBack, onNewChat }: CoachChatTopBarProps) {
  return (
    <div className="sticky top-0 z-10 flex shrink-0 items-center gap-1 border-b border-border bg-bg px-2 py-1">
      <IconButton aria-label="Back to notes" onClick={onBack}>
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </IconButton>
      <h1 className="t-title-3 min-w-0 flex-1 truncate">{title}</h1>
      <IconButton aria-label="New chat" onClick={onNewChat}>
        <Plus className="h-5 w-5" aria-hidden="true" />
      </IconButton>
    </div>
  )
}

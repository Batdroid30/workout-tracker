'use client'

import { ChevronDown } from 'lucide-react'
import { Button, Chip, IconButton } from '@/components/ui'
import { useNow } from '@/hooks/useNow'
import { formatDuration } from '@/lib/time'

interface LoggerHeaderProps {
  title: string
  onTitleChange: (title: string) => void
  startedAt: Date
  progress: { done: number; total: number }
  weekChip: string | null
  onMinimize: () => void
  onFinish: () => void
  isFinishing: boolean
}

export function LoggerHeader({ title, onTitleChange, startedAt, progress, weekChip, onMinimize, onFinish, isFinishing }: LoggerHeaderProps) {
  const now = useNow()
  const elapsed = formatDuration(now - new Date(startedAt).getTime())

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg px-3 pb-3 pt-3">
      <div className="flex items-center gap-2">
        <IconButton aria-label="Minimize workout" onClick={onMinimize}>
          <ChevronDown className="h-5 w-5" aria-hidden="true" />
        </IconButton>
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={title}
            onChange={event => onTitleChange(event.target.value)}
            placeholder="Session title"
            aria-label="Workout title"
            className="w-full bg-transparent p-0 text-base font-semibold text-primary outline-none placeholder:text-tertiary"
          />
          <p className="t-caption mono">{elapsed} · {progress.done} of {progress.total} exercises</p>
        </div>
        <Button size="sm" fullWidth={false} onClick={onFinish} loading={isFinishing}>
          {isFinishing ? 'Saving…' : 'Finish'}
        </Button>
      </div>
      {weekChip && <div className="mt-2 pl-12"><Chip>{weekChip}</Chip></div>}
    </header>
  )
}

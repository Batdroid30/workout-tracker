import { useState, useRef, useEffect, type KeyboardEvent, type FormEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { IconButton } from '@/components/ui'

interface CoachInputProps {
  onSend: (message: string) => void
  onStop?: () => void
  isStreaming?: boolean
  disabled?: boolean
}

export function CoachInput({
  onSend,
  onStop,
  isStreaming = false,
  disabled = false,
}: CoachInputProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        140
      )}px`
    }
  }, [text])

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (!text.trim() || isStreaming || disabled) return
    onSend(text.trim())
    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="relative flex items-end gap-2 rounded-card border border-border-strong bg-surface-raised p-2 focus-within:border-accent"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask coach anything (exercises, volume, routines)..."
        disabled={disabled}
        className="max-h-36 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-base text-primary placeholder:text-tertiary focus:outline-none disabled:opacity-50"
      />

      {isStreaming ? (
        <IconButton variant="secondary" aria-label="Stop response" onClick={onStop} className="shrink-0">
          <Square className="h-4 w-4 fill-current" />
        </IconButton>
      ) : (
        <IconButton
          variant="primary"
          type="submit"
          aria-label="Send message"
          disabled={!text.trim() || disabled}
          className="shrink-0"
        >
          <ArrowUp className="h-4 w-4" />
        </IconButton>
      )}
    </form>
  )
}

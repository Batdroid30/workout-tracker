import { useState, useRef, useEffect, type KeyboardEvent, type FormEvent } from 'react'
import { ArrowUp, Square } from 'lucide-react'

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
      className="relative flex items-end gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/90 p-2 shadow-lg backdrop-blur-md focus-within:border-teal-500/50"
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask coach anything (exercises, volume, routines)..."
        disabled={disabled}
        className="max-h-36 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none disabled:opacity-50"
      />

      {isStreaming ? (
        <button
          type="button"
          onClick={onStop}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
          title="Stop response"
        >
          <Square className="h-4 w-4 fill-current" />
        </button>
      ) : (
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white transition-all hover:bg-teal-500 disabled:opacity-30 disabled:hover:bg-teal-600 active:scale-95"
          title="Send message"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </form>
  )
}

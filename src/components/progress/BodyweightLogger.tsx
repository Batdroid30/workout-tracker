'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Scale } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BodyweightLoggerProps {
  latestWeight: number | null
}

type LogStatus = 'idle' | 'saving' | 'saved' | 'error'

export function BodyweightLogger({ latestWeight }: BodyweightLoggerProps) {
  const router = useRouter()
  const [value, setValue]   = useState(latestWeight?.toString() ?? '')
  const [status, setStatus] = useState<LogStatus>('idle')

  async function handleLog() {
    const weight = parseFloat(value)
    if (!weight || weight <= 0 || weight > 500) return
    setStatus('saving')
    try {
      const res = await fetch('/api/bodyweight', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ weight_kg: weight }),
      })
      if (!res.ok) throw new Error('Request failed')
      setStatus('saved')
      router.refresh()
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 2000)
    }
  }

  const isBusy = status === 'saving'

  return (
    <div className="flex items-center gap-2 pt-1">
      <Scale className="w-3.5 h-3.5 text-[var(--text-low)] shrink-0" />

      <div className="relative flex-1">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          min="20"
          max="500"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLog()}
          placeholder={latestWeight ? `Last: ${latestWeight}` : 'Enter weight'}
          className="w-full h-9 bg-white/[0.04] border border-[var(--glass-border)] rounded-xl px-3 pr-8 mono text-[13px] text-[var(--text-hi)] placeholder:text-[var(--text-faint)] focus:outline-none focus:border-[var(--accent-line)] text-center tabular-nums"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-faint)] pointer-events-none">
          kg
        </span>
      </div>

      <button
        onClick={handleLog}
        disabled={isBusy || !value}
        className={cn(
          'shrink-0 h-9 px-4 font-medium text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95',
          status === 'saved'
            ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
            : status === 'error'
            ? 'bg-[var(--rose)]/20 text-[var(--rose)]'
            : 'bg-[var(--accent)] text-[var(--accent-on)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed',
        )}
      >
        {status === 'saving' ? '…' : status === 'saved' ? '✓' : status === 'error' ? 'Error' : 'Log'}
      </button>
    </div>
  )
}

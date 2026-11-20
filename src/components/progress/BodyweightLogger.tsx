'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Scale } from 'lucide-react'
import { Button } from '@/components/ui'

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
      <Scale className="w-3.5 h-3.5 text-tertiary shrink-0" />

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
          className="w-full h-9 bg-surface-raised border border-border rounded-field px-3 pr-8 mono text-base text-primary placeholder:text-tertiary focus:outline-none focus:border-border-strong text-center tabular-nums"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-tertiary pointer-events-none">
          kg
        </span>
      </div>

      <Button
        onClick={handleLog}
        disabled={!value}
        loading={isBusy}
        size="sm"
        fullWidth={false}
        variant={status === 'error' ? 'destructive' : status === 'saved' ? 'secondary' : 'primary'}
        className="shrink-0"
      >
        {status === 'saved' ? '✓' : status === 'error' ? 'Error' : 'Log'}
      </Button>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InsightCardProps {
  title:       string
  icon:        React.ReactNode
  variant?:    'neutral' | 'positive' | 'warning'
  dismissKey?: string
  children:    React.ReactNode
}

const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000

const VARIANT_CLASS: Record<NonNullable<InsightCardProps['variant']>, string> = {
  neutral:  '',
  positive: 'bg-positive-soft',
  warning:  'bg-caution-soft',
}

export function InsightCard({
  title,
  icon,
  variant = 'neutral',
  dismissKey,
  children,
}: InsightCardProps) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!dismissKey) return
    const ts = localStorage.getItem(dismissKey)
    if (ts && Date.now() - Number(ts) < DISMISS_DURATION_MS) setDismissed(true)
  }, [dismissKey])

  const handleDismiss = () => {
    if (dismissKey) localStorage.setItem(dismissKey, String(Date.now()))
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className={cn('card p-4', VARIANT_CLASS[variant])}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="leading-none">{icon}</span>
          <h3 className="t-label">{title}</h3>
        </div>
        {dismissKey && (
          <button
            onClick={handleDismiss}
            className="transition-colors p-2 -mr-1.5 -mt-0.5 rounded-lg text-tertiary hover:bg-surface-raised"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

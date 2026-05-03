'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InsightCardProps {
  title: string
  icon: React.ReactNode
  variant?: 'neutral' | 'positive' | 'warning'
  dismissKey?: string
  children: React.ReactNode
}

const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000

const variantBorder: Record<NonNullable<InsightCardProps['variant']>, string> = {
  neutral:  '',
  positive: 'border-[var(--accent-line)]',
  warning:  'border-[var(--rose)]/30',
}

export function InsightCard({ title, icon, variant = 'neutral', dismissKey, children }: InsightCardProps) {
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
    <div className={cn('glass p-4', variantBorder[variant])}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm leading-none">{icon}</span>
          <h3 className="t-label">{title}</h3>
        </div>
        {dismissKey && (
          <button
            onClick={handleDismiss}
            className="text-[var(--text-faint)] hover:text-[var(--text-low)] transition-colors p-2 -mr-1.5 -mt-0.5 rounded-lg"
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

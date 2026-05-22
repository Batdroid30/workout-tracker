'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface InsightCardProps {
  title:       string
  icon:        React.ReactNode
  variant?:    'neutral' | 'positive' | 'warning'
  dismissKey?: string
  children:    React.ReactNode
}

const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000

const VARIANT_STYLE: Record<NonNullable<InsightCardProps['variant']>, React.CSSProperties> = {
  neutral:  {},
  positive: {
    borderColor: 'var(--accent-line)',
    background:  'linear-gradient(145deg, rgba(243,192,138,0.07) 0%, rgba(243,192,138,0.02) 100%)',
  },
  warning: {
    borderColor: 'rgba(230,163,154,0.40)',
    background:  'linear-gradient(145deg, rgba(230,163,154,0.07) 0%, rgba(230,163,154,0.02) 100%)',
  },
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
    <div className="glass p-4" style={VARIANT_STYLE[variant]}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="leading-none">{icon}</span>
          <h3 className="t-label">{title}</h3>
        </div>
        {dismissKey && (
          <button
            onClick={handleDismiss}
            className="transition-colors p-2 -mr-1.5 -mt-0.5 rounded-lg hover:bg-white/[0.04]"
            style={{ color: 'var(--text-faint)' }}
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

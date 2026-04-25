'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface InsightCardProps {
  title: string
  icon: React.ReactNode
  variant?: 'neutral' | 'positive' | 'warning'
  /** localStorage key — if provided, card can be dismissed for 14 days */
  dismissKey?: string
  children: React.ReactNode
}

const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000 // 14 days

const variantStyles = {
  neutral: 'border-[#334155]',
  positive: 'border-[#CCFF00]/30',
  warning:  'border-orange-500/30',
} as const

export function InsightCard({ title, icon, variant = 'neutral', dismissKey, children }: InsightCardProps) {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!dismissKey) return
    const ts = localStorage.getItem(dismissKey)
    if (ts && Date.now() - Number(ts) < DISMISS_DURATION_MS) {
      setDismissed(true)
    }
  }, [dismissKey])

  const handleDismiss = () => {
    if (dismissKey) localStorage.setItem(dismissKey, String(Date.now()))
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className={`glass-panel border ${variantStyles[variant]} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#adb4ce]">{title}</h3>
        </div>
        {dismissKey && (
          <button
            onClick={handleDismiss}
            className="text-[#334155] hover:text-[#4a5568] transition-colors p-1 -mr-1 rounded-lg"
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

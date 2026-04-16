'use client'
import { Trophy } from 'lucide-react'
import type { PRCheckResult } from '@/types/database'

interface PRBannerProps {
  pr: PRCheckResult | null
  onDismiss: () => void
}

export function PRBanner({ pr, onDismiss }: PRBannerProps) {
  if (!pr) return null

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 p-4 rounded-2xl shadow-xl flex items-center justify-between shadow-yellow-500/20 border border-yellow-400/20">
        <div className="flex items-center gap-3">
          <div className="bg-black/20 p-2 rounded-full">
            <Trophy className="w-6 h-6 text-yellow-50 pt-0.5" />
          </div>
          <div>
            <p className="font-bold text-white leading-tight font-sans">
              New {pr.pr_type === 'best_weight' ? 'Weight PR' : pr.pr_type === 'best_1rm' ? '1RM PR' : 'Volume PR'}!
            </p>
            <p className="text-yellow-100 font-mono text-sm tracking-wide">{pr.old_value || 0} → {pr.new_value}</p>
          </div>
        </div>
        <button onClick={onDismiss} className="text-yellow-100 font-bold text-sm bg-black/20 px-3 py-1.5 rounded-lg active:scale-95 transition-transform hover:bg-black/30">
          Dismiss
        </button>
      </div>
    </div>
  )
}

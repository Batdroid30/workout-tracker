'use client'

import { useRouter } from 'next/navigation'
import { useRef, useState, useCallback } from 'react'
import { refreshCacheAction } from '@/app/(app)/profile/actions'

// Finger must travel this many px downward before refresh triggers
const TRIGGER_THRESHOLD = 80

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [pullY, setPullY] = useState(0)       // visual height of the indicator
  const [isRefreshing, setIsRefreshing] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const atTop = window.scrollY === 0 || document.documentElement.scrollTop === 0
    if (atTop && !isRefreshing) {
      startY.current = e.touches[0].clientY
      pulling.current = true
    }
  }, [isRefreshing])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current) return
    const delta = e.touches[0].clientY - startY.current
    if (delta <= 0) { pulling.current = false; setPullY(0); return }
    // Dampen so the indicator moves at half the finger speed, capped at 48px
    setPullY(Math.min(delta * 0.5, 48))
  }, [])

  const onTouchEnd = useCallback(async () => {
    if (!pulling.current) return
    pulling.current = false

    const rawDelta = pullY / 0.5 // recover raw finger distance
    if (rawDelta < TRIGGER_THRESHOLD) {
      setPullY(0)
      return
    }

    setIsRefreshing(true)
    setPullY(0)

    try {
      await refreshCacheAction()
      router.refresh()
    } finally {
      // Small delay so the spinner is visible even on fast connections
      setTimeout(() => setIsRefreshing(false), 600)
    }
  }, [pullY, router])

  const indicatorHeight = isRefreshing ? 48 : pullY
  const spinDeg = Math.round((pullY / 48) * 270) // rotate as user pulls

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="flex flex-col min-h-screen bg-[#070d1f]"
    >
      {/* Pull indicator — only visible while pulling or refreshing */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200 ease-out shrink-0"
        style={{ height: indicatorHeight }}
      >
        <div
          className={`w-5 h-5 rounded-full border-2 border-[#CCFF00] border-t-transparent ${isRefreshing ? 'animate-spin' : ''}`}
          style={isRefreshing ? undefined : { transform: `rotate(${spinDeg}deg)` }}
        />
      </div>

      {children}
    </div>
  )
}

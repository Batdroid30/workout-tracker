'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { expandedAt, nextCollapsed, type CollapseState } from './scroll-collapse'

export function useCollapseOnScroll(enabled: boolean): { collapsed: boolean; expand: () => void } {
  const [collapsed, setCollapsed] = useState(false)
  const stateRef = useRef<CollapseState>({ collapsed: false, anchorY: 0 })

  useEffect(() => {
    if (!enabled) return

    // Re-enabling (e.g. leaving /workout) starts from an expanded bar at the
    // real position; a stale collapsed state would otherwise survive.
    stateRef.current = expandedAt(window.scrollY)

    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const next = nextCollapsed(stateRef.current, window.scrollY)
        stateRef.current = next
        setCollapsed(next.collapsed)
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [enabled])

  const expand = useCallback(() => {
    stateRef.current = expandedAt(window.scrollY)
    setCollapsed(false)
  }, [])

  return { collapsed: enabled && collapsed, expand }
}

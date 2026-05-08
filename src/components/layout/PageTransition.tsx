'use client'

import { usePathname } from 'next/navigation'
import { type ReactNode } from 'react'

/**
 * Replays the page-in CSS animation on every route change.
 * The `key` prop forces React to unmount+remount the div whenever
 * the pathname changes, which restarts the animation.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="page-in">
      {children}
    </div>
  )
}

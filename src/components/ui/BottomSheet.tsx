'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

interface BottomSheetProps {
  /** Controls visibility. Nothing renders when false. */
  isOpen: boolean
  onClose: () => void
  /** Optional heading shown in the top-left of the sheet. */
  title?: string
  /** Optional icon rendered next to the title. */
  icon?: React.ReactNode
  children: React.ReactNode
  /**
   * "bottom" (default) — slides up from the bottom edge.
   * "center" — floats centred in the viewport; better for tall content.
   */
  position?: 'bottom' | 'center'
}

/**
 * Shared overlay used throughout the app.
 *
 * Renders into document.body via a React portal so it is never clipped by
 * an ancestor's stacking context (e.g. sticky nav with backdrop-blur).
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  icon,
  children,
  position = 'bottom',
}: BottomSheetProps) {
  // Track client-side mount so createPortal is never called during SSR
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!isOpen || !mounted) return null

  const isCentered = position === 'center'

  const content = (
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {isCentered ? (
        /* Scroll layer — sits above backdrop, scrollable for tall panels */
        <div className="absolute inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-sm bg-[#0c1324] border border-[#334155] rounded-2xl p-5 pb-6">
              {title && <SheetHeader title={title} icon={icon} onClose={onClose} />}
              {children}
            </div>
          </div>
        </div>
      ) : (
        /* Bottom panel */
        <div className="absolute bottom-0 left-0 right-0 bg-[#0c1324] border-t border-[#334155] rounded-t-2xl p-5 pb-8 max-h-[85dvh] overflow-y-auto">
          {title && <SheetHeader title={title} icon={icon} onClose={onClose} />}
          {children}
        </div>
      )}
    </div>
  )

  return createPortal(content, document.body)
}

// ── Internal header shared between both layouts ───────────────────────────────

function SheetHeader({
  title,
  icon,
  onClose,
}: {
  title: string
  icon?: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-black uppercase tracking-widest text-white">{title}</h2>
      </div>
      <button
        onClick={onClose}
        className="text-[#4a5568] hover:text-white p-2.5 rounded-lg transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

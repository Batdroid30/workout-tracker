'use client'

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
}

/**
 * Shared bottom-sheet overlay used throughout the app.
 * Renders a semi-transparent backdrop + a rounded-top panel.
 * Clicking the backdrop closes the sheet.
 */
export function BottomSheet({ isOpen, onClose, title, icon, children }: BottomSheetProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full bg-[#0c1324] border-t border-[#334155] rounded-t-2xl p-5 pb-8 max-h-[90dvh] overflow-y-auto">
        {title && (
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
        )}
        {children}
      </div>
    </div>
  )
}

import { type ReactNode } from 'react'

interface SupersetWrapperProps {
  children: ReactNode
}

/**
 * Visual container for exercises that share a superset_group.
 * Draws a left accent rail and a SUPERSET badge above the group.
 */
export function SupersetWrapper({ children }: SupersetWrapperProps) {
  return (
    <div className="relative mb-4">
      {/* Badge */}
      <div className="flex items-center gap-2 mb-1.5 pl-3">
        <span
          className="inline-flex items-center h-5 px-2 rounded-full text-[9px] font-bold tracking-widest uppercase"
          style={{
            background: 'var(--accent-soft)',
            border:     '1px solid var(--accent-line)',
            color:      'var(--accent)',
          }}
        >
          Superset
        </span>
      </div>

      {/* Accent rail + exercises */}
      <div className="flex gap-2">
        <div
          className="w-0.5 rounded-full shrink-0 self-stretch"
          style={{ background: 'var(--accent)' }}
        />
        <div className="flex-1 space-y-2">
          {children}
        </div>
      </div>
    </div>
  )
}

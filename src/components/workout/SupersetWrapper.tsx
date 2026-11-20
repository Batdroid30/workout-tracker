import { type ReactNode } from 'react'
import { Chip } from '@/components/ui'

interface SupersetWrapperProps {
  children: ReactNode
  exerciseNames: string[]
  /** Drag handle for the whole superset. */
  handle?: ReactNode
}

export function SupersetWrapper({ children, exerciseNames, handle = null }: SupersetWrapperProps) {
  return (
    <div className="relative mb-4">
      {/* Badge + exercise names */}
      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
        {handle}
        <Chip>Superset</Chip>
        <span className="text-xs text-tertiary truncate min-w-0">
          {exerciseNames.join(' · ')}
        </span>
      </div>

      {/* Accent rail + exercises */}
      <div className="flex gap-2">
        <div className="w-0.5 rounded-full shrink-0 self-stretch bg-border-strong" />
        <div className="flex-1 space-y-2">
          {children}
        </div>
      </div>
    </div>
  )
}

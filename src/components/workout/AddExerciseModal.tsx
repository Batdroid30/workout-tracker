'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Search, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Exercise } from '@/types/database'
import { useExercises } from '@/hooks/useExercises'
import { Button } from '@/components/ui'

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']

const MUSCLE_GROUP_CATEGORY_MAP: Record<string, string> = {
  chest: 'Chest',
  back: 'Back', lats: 'Back', traps: 'Back',
  quads: 'Legs', hamstrings: 'Legs', glutes: 'Legs', calves: 'Legs',
  shoulders: 'Shoulders',
  biceps: 'Arms', triceps: 'Arms', forearms: 'Arms',
  core: 'Core',
}

function mapToCategory(mg: string): string {
  return MUSCLE_GROUP_CATEGORY_MAP[mg.toLowerCase()] ?? 'Other'
}

interface AddExerciseModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (exercises: Exercise[]) => void
}

export function AddExerciseModal({ isOpen, onClose, onConfirm }: AddExerciseModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab,   setActiveTab]   = useState('All')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { exercises, loading } = useExercises(isOpen)

  useEffect(() => {
    if (isOpen) { setSearchQuery(''); setActiveTab('All'); setSelectedIds(new Set()) }
  }, [isOpen])

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      if (!ex.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (activeTab !== 'All') {
        const primaryMatches   = mapToCategory(ex.muscle_group) === activeTab
        const secondaryMatches = (ex.secondary_muscles ?? []).some(
          sm => mapToCategory(sm) === activeTab
        )
        if (!primaryMatches && !secondaryMatches) return false
      }
      return true
    })
  }, [exercises, searchQuery, activeTab])

  const toggleExercise = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleConfirm = useCallback(() => {
    const chosen = exercises.filter(e => selectedIds.has(e.id))
    if (chosen.length === 0) return
    onConfirm(chosen)
    onClose()
  }, [exercises, selectedIds, onConfirm, onClose])

  if (!isOpen) return null

  const selectionCount = selectedIds.size

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[500px] animate-in slide-in-from-bottom duration-300 bg-bg border-l border-border"
    >

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 sticky top-0 z-20 bg-bg border-b border-border"
      >
        <div>
          <p className="t-label mb-0.5">
            {selectionCount > 0 ? `${selectionCount} selected` : 'Select'}
          </p>
          <h2 className="t-display-s">Add exercise</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 rounded-control text-tertiary hover:text-primary hover:bg-surface-raised transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Search + filter */}
      <div
        className="p-4 space-y-3 sticky z-10 bg-bg border-b border-border"
        style={{ top: 65 }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
          <input
            placeholder="Search exercises…"
            className="w-full h-11 pl-9 pr-4 rounded-field text-sm text-primary placeholder:text-tertiary bg-surface-raised border border-border focus:outline-none transition-colors"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 items-center no-scrollbar">
          {MUSCLE_GROUPS.map(mg => (
            <button
              key={mg}
              onClick={() => setActiveTab(mg)}
              className={cn(
                'whitespace-nowrap min-h-9 px-3 rounded-pill t-caption font-medium transition-colors shrink-0',
                activeTab === mg
                  ? 'bg-accent text-on-accent'
                  : 'bg-surface-raised border border-border text-tertiary',
              )}
            >
              {mg}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-7 h-7 border-2 border-secondary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredExercises.length === 0 ? (
          <p className="text-center text-tertiary text-sm mt-8">No exercises found.</p>
        ) : (
          filteredExercises.map(ex => {
            const isSelected = selectedIds.has(ex.id)
            return (
              <button
                key={ex.id}
                onClick={() => toggleExercise(ex.id)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3.5 rounded-control text-left border transition-all active:scale-[0.98]',
                  isSelected ? 'bg-surface-raised border-border-strong' : 'bg-surface border-border',
                )}
              >
                <div>
                  <p className={cn(
                    'font-medium text-sm text-primary transition-colors',
                  )}>
                    {ex.name}
                  </p>
                  <p className="text-xs text-tertiary mt-0.5 capitalize">
                    {ex.muscle_group}{ex.equipment ? ` · ${ex.equipment}` : ''}
                  </p>
                </div>

                <div
                  className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center border transition-all shrink-0',
                    isSelected ? 'bg-primary border-border-strong' : 'bg-surface-raised border-border',
                  )}
                >
                  {isSelected && <Check className="w-3.5 h-3.5 text-bg" strokeWidth={3} />}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Sticky confirm bar */}
      {selectionCount > 0 && (
        <div
          className="sticky bottom-0 px-4 py-3 bg-bg border-t border-border"
        >
          <div className="flex gap-1.5 flex-wrap mb-3">
            {exercises.filter(e => selectedIds.has(e.id)).map(e => (
              <span
                key={e.id}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-surface-raised text-primary"
              >
                {e.name}
                <button
                  onClick={ev => { ev.stopPropagation(); toggleExercise(e.id) }}
                  className="ml-0.5 transition-opacity hover:opacity-100 opacity-60"
                  aria-label={`Remove ${e.name}`}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
          <Button onClick={handleConfirm}>
            Add {selectionCount} exercise{selectionCount > 1 ? 's' : ''} →
          </Button>
        </div>
      )}
    </div>
  )
}

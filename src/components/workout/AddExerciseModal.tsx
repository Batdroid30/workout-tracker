'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { Search, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Exercise } from '@/types/database'
import { useExercises } from '@/hooks/useExercises'
import { Button } from '@/components/ui/Button'

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
  /**
   * Called with the full array of selected exercises when the user confirms.
   * Always receives at least one exercise (the confirm button is disabled otherwise).
   */
  onConfirm: (exercises: Exercise[]) => void
}

export function AddExerciseModal({ isOpen, onClose, onConfirm }: AddExerciseModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab,   setActiveTab]   = useState('All')
  // Set of selected exercise IDs — cleared each time the modal opens
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const { exercises, loading } = useExercises(isOpen)

  // Reset search + selection whenever the modal re-opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('')
      setActiveTab('All')
      setSelectedIds(new Set())
    }
  }, [isOpen])

  const filteredExercises = useMemo(() => {
    return exercises.filter(ex => {
      if (!ex.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (activeTab !== 'All' && mapToCategory(ex.muscle_group) !== activeTab) return false
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
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070d1f] lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[500px] lg:border-l lg:border-[#334155] animate-in slide-in-from-bottom duration-300">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#334155] bg-[#070d1f]/95 backdrop-blur sticky top-0 z-20">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#4a5568] leading-none mb-0.5">
            {selectionCount > 0 ? `${selectionCount} selected` : 'Select'}
          </p>
          <h2 className="text-lg font-black italic uppercase tracking-tight text-white">Add Exercise</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 hover:bg-[#151b2d] rounded-lg transition-colors text-[#adb4ce]"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* ── Search + filter tabs ── */}
      <div className="p-4 space-y-3 border-b border-[#334155] bg-[#070d1f] sticky top-[65px] z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#334155]" />
          <input
            placeholder="Search exercises..."
            className="w-full h-11 pl-9 pr-4 bg-[#0c1324] border border-[#334155] rounded-xl text-sm text-[#dce1fb] placeholder:text-[#334155] focus:outline-none focus:border-[#CCFF00]/40 font-body transition-colors"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 items-center scrollbar-none">
          {MUSCLE_GROUPS.map(mg => (
            <button
              key={mg}
              onClick={() => setActiveTab(mg)}
              className={cn(
                'whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors shrink-0',
                activeTab === mg
                  ? 'bg-[#CCFF00] text-[#020617]'
                  : 'bg-[#0c1324] border border-[#334155] text-[#4a5568] hover:text-[#adb4ce]',
              )}
            >
              {mg}
            </button>
          ))}
        </div>
      </div>

      {/* ── Exercise list ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-32">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-7 h-7 border-2 border-[#CCFF00] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredExercises.length === 0 ? (
          <p className="text-center text-[#4a5568] text-sm font-body mt-8">No exercises found.</p>
        ) : (
          filteredExercises.map(ex => {
            const isSelected = selectedIds.has(ex.id)
            return (
              <button
                key={ex.id}
                onClick={() => toggleExercise(ex.id)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-all active:scale-[0.98]',
                  isSelected
                    ? 'border-[#CCFF00]/40 bg-[#CCFF00]/5'
                    : 'glass-panel border-[#334155] hover:border-[#CCFF00]/30',
                )}
              >
                <div>
                  <p className={cn(
                    'font-black uppercase tracking-tight text-sm transition-colors',
                    isSelected ? 'text-[#CCFF00]' : 'text-white',
                  )}>
                    {ex.name}
                  </p>
                  <p className="text-[11px] text-[#4a5568] font-body mt-0.5 capitalize">
                    {ex.muscle_group}{ex.equipment ? ` · ${ex.equipment}` : ''}
                  </p>
                </div>

                {/* Checkbox indicator */}
                <div className={cn(
                  'w-7 h-7 rounded-lg flex items-center justify-center border transition-all shrink-0',
                  isSelected
                    ? 'bg-[#CCFF00] border-[#CCFF00]'
                    : 'bg-[#151b2d] border-[#334155]',
                )}>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#020617]" strokeWidth={3} />}
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* ── Sticky confirm bar — only visible when ≥1 selected ── */}
      {selectionCount > 0 && (
        <div className="sticky bottom-0 px-4 py-3 bg-[#070d1f]/95 backdrop-blur border-t border-[#334155]">
          {/* Mini tray showing selected exercise names */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {exercises
              .filter(e => selectedIds.has(e.id))
              .map(e => (
                <span
                  key={e.id}
                  className="flex items-center gap-1 px-2 py-1 bg-[#CCFF00]/10 border border-[#CCFF00]/20 rounded-lg text-[10px] font-black text-[#CCFF00] uppercase tracking-wide"
                >
                  {e.name}
                  <button
                    onClick={ev => { ev.stopPropagation(); toggleExercise(e.id) }}
                    className="text-[#CCFF00]/60 hover:text-[#CCFF00] transition-colors ml-0.5"
                    aria-label={`Remove ${e.name}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
          </div>

          <Button onClick={handleConfirm}>
            Add {selectionCount} Exercise{selectionCount > 1 ? 's' : ''} →
          </Button>
        </div>
      )}
    </div>
  )
}

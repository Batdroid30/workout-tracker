'use client'

import { useState, useMemo } from 'react'
import { Search, X, Check } from 'lucide-react'
import { Exercise } from '@/types/database'
import { useExercises } from '@/hooks/useExercises'

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']

const MUSCLE_GROUP_CATEGORY_MAP: Record<string, string> = {
  chest: 'Chest',
  back: 'Back', lats: 'Back', traps: 'Back',
  quads: 'Legs', hamstrings: 'Legs', glutes: 'Legs', calves: 'Legs',
  shoulders: 'Shoulders',
  biceps: 'Arms', triceps: 'Arms', forearms: 'Arms',
  core: 'Core'
}

const mapDbMuscleGroupToCategory = (mg: string) => {
  return MUSCLE_GROUP_CATEGORY_MAP[mg.toLowerCase()] || 'Other'
}

interface AddExerciseModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (exercise: Exercise) => void
}

export function AddExerciseModal({ isOpen, onClose, onSelect }: AddExerciseModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  
  const { exercises, loading, error } = useExercises(isOpen)

  const filteredExercises = useMemo(() => {
    return exercises.filter((ex) => {
      const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase())
      if (!matchesSearch) return false

      if (activeTab !== 'All') {
        const category = mapDbMuscleGroupToCategory(ex.muscle_group)
        if (category !== activeTab) return false
      }

      return true
    })
  }, [exercises, searchQuery, activeTab])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#070d1f] lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[500px] lg:border-l lg:border-[#334155] animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between px-4 py-4 border-b border-[#334155] bg-[#070d1f]/95 backdrop-blur sticky top-0 z-20">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#4a5568] leading-none mb-0.5">Select</p>
          <h2 className="text-lg font-black italic uppercase tracking-tight text-white">Add Exercise</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2.5 hover:bg-[#151b2d] rounded-lg transition-colors text-[#adb4ce]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-3 border-b border-[#334155] bg-[#070d1f] sticky top-[65px] z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#334155]" />
          <input
            placeholder="Search exercises..."
            className="w-full h-11 pl-9 pr-4 bg-[#0c1324] border border-[#334155] rounded-xl text-sm text-[#dce1fb] placeholder:text-[#334155] focus:outline-none focus:border-[#CCFF00]/40 font-body transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 items-center scrollbar-none">
          {MUSCLE_GROUPS.map((mg) => {
            const isActive = activeTab === mg
            return (
              <button
                key={mg}
                onClick={() => setActiveTab(mg)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors shrink-0 ${
                  isActive
                    ? 'bg-[#CCFF00] text-[#020617]'
                    : 'bg-[#0c1324] border border-[#334155] text-[#4a5568] hover:text-[#adb4ce]'
                }`}
              >
                {mg}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-7 h-7 border-2 border-[#CCFF00] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredExercises.length === 0 ? (
          <p className="text-center text-[#4a5568] text-sm font-body mt-8">No exercises found.</p>
        ) : (
          filteredExercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => onSelect(ex)}
              className="w-full flex items-center justify-between px-4 py-3.5 glass-panel border border-[#334155] hover:border-[#CCFF00]/30 transition-all rounded-xl text-left active:scale-[0.98] group"
            >
              <div>
                <p className="font-black text-white uppercase tracking-tight text-sm group-hover:text-[#CCFF00] transition-colors">{ex.name}</p>
                <p className="text-[11px] text-[#4a5568] font-body mt-0.5 capitalize">
                  {ex.muscle_group}{ex.equipment ? ` · ${ex.equipment}` : ''}
                </p>
              </div>
              <div className="w-7 h-7 rounded-lg bg-[#151b2d] border border-[#334155] flex items-center justify-center group-hover:bg-[#CCFF00]/10 group-hover:border-[#CCFF00]/30 transition-all">
                <Check className="w-3.5 h-3.5 text-[#4a5568] opacity-0 group-hover:opacity-100 group-hover:text-[#CCFF00] transition-all" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

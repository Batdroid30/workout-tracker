'use client'

import { useState, useMemo } from 'react'
import { Search, X, Check } from 'lucide-react'
import { Input } from '@/components/ui/Input'
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
    <div className="fixed inset-0 z-50 flex flex-col bg-black lg:inset-y-0 lg:right-0 lg:left-auto lg:w-[500px] lg:border-l lg:border-zinc-800 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-black/80 backdrop-blur sticky top-0 z-20">
        <h2 className="text-xl font-bold">Add Exercise</h2>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-zinc-900 rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="p-4 space-y-4 border-b border-zinc-900 bg-black/50 sticky top-[65px] z-10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input 
            placeholder="Search exercise..." 
            className="pl-10 !h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 items-center no-scrollbar">
          {MUSCLE_GROUPS.map((mg) => {
            const isActive = activeTab === mg
            return (
              <button 
                key={mg}
                onClick={() => setActiveTab(mg)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-colors shrink-0 ${
                  isActive ? 'bg-brand text-white' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
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
            <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredExercises.length === 0 ? (
          <p className="text-center text-zinc-500 font-mono mt-8">No exercises found.</p>
        ) : (
          filteredExercises.map((ex) => (
            <button
              key={ex.id}
              onClick={() => onSelect(ex)}
              className="w-full flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all rounded-xl text-left active:scale-[0.98] group"
            >
              <div>
                <p className="font-bold text-white group-hover:text-brand transition-colors">{ex.name}</p>
                <p className="text-xs text-zinc-500 mt-1 capitalize">
                  {ex.muscle_group} {ex.equipment ? `• ${ex.equipment}` : ''}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-brand/20 group-hover:text-brand transition-colors">
                <Check className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

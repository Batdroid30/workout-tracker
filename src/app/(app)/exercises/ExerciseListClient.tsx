'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { Exercise } from '@/types/database'

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']

// Mapping from DB muscle groups to the display categories
const mapDbMuscleGroupToCategory = (mg: string) => {
  const normalized = mg.toLowerCase()
  if (['chest'].includes(normalized)) return 'Chest'
  if (['back', 'lats', 'traps'].includes(normalized)) return 'Back'
  if (['quads', 'hamstrings', 'glutes', 'calves'].includes(normalized)) return 'Legs'
  if (['shoulders'].includes(normalized)) return 'Shoulders'
  if (['biceps', 'triceps', 'forearms'].includes(normalized)) return 'Arms'
  if (['core'].includes(normalized)) return 'Core'
  return 'Other'
}

interface ExerciseListClientProps {
  initialExercises: Exercise[]
  hideTitle?: boolean
}

export function ExerciseListClient({ initialExercises, hideTitle }: ExerciseListClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('All')

  const filteredExercises = useMemo(() => {
    return initialExercises.filter((ex) => {
      // Filter by search
      const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase())
      if (!matchesSearch) return false

      // Filter by muscle group
      if (activeTab !== 'All') {
        const category = mapDbMuscleGroupToCategory(ex.muscle_group)
        if (category !== activeTab) return false
      }

      return true
    })
  }, [initialExercises, searchQuery, activeTab])

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-[#070d1f]/95 backdrop-blur pb-4 pt-4 px-4 space-y-3 border-b border-[#334155]">
        {!hideTitle && (
          <div>
            <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#4a5568] mb-0.5">Library</p>
            <h1 className="text-2xl font-black italic uppercase tracking-tight text-white">Exercises</h1>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#334155]" />
          <input
            placeholder="Search exercises..."
            className="w-full h-11 pl-9 pr-4 bg-[#0c1324] border border-[#334155] rounded-xl text-sm text-[#dce1fb] placeholder:text-[#334155] focus:outline-none focus:border-[#CCFF00]/40 font-body transition-colors"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        <div className="space-y-2">
          {filteredExercises.length === 0 ? (
            <p className="text-center text-[#4a5568] text-sm font-body mt-8">No exercises found.</p>
          ) : (
            filteredExercises.map((ex) => (
              <Link href={`/exercises/${ex.id}`} key={ex.id}>
                <div className="flex items-center justify-between px-4 py-3.5 glass-panel border border-[#334155] hover:border-[#CCFF00]/30 transition-colors rounded-xl cursor-pointer active:scale-[0.98] mb-2">
                  <div>
                    <p className="font-black text-white uppercase tracking-tight text-sm">{ex.name}</p>
                    <p className="text-[11px] text-[#4a5568] font-body mt-0.5 capitalize">
                      {ex.muscle_group}{ex.equipment ? ` · ${ex.equipment}` : ''}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

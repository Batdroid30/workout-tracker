'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/Input'
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
}

export function ExerciseListClient({ initialExercises }: ExerciseListClientProps) {
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
      {/* Heavy-style sticky header with search */}
      <div className="sticky top-0 z-10 bg-black/90 backdrop-blur pb-4 pt-4 px-4 space-y-4 border-b border-zinc-900">
        <h1 className="text-2xl font-bold font-sans">Exercises</h1>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input 
            placeholder="Search exercise..." 
            className="pl-10 pb-0 pt-0 !h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Scrollable chips */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 items-center">
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

      {/* Grid of exercise items */}
      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        <div className="space-y-3">
          {filteredExercises.length === 0 ? (
            <p className="text-center text-zinc-500 font-mono mt-8">No exercises found.</p>
          ) : (
            filteredExercises.map((ex) => (
              <Link href={`/exercises/${ex.id}`} key={ex.id}>
                <div className="flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors rounded-xl cursor-pointer active:scale-[0.98] mb-3">
                  <div>
                    <p className="font-bold text-white font-sans text-lg">{ex.name}</p>
                    <p className="text-sm text-zinc-500 font-mono mt-1 capitalize hover:text-zinc-300 transition-colors">
                      {ex.muscle_group} {ex.equipment ? `• ${ex.equipment}` : ''}
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

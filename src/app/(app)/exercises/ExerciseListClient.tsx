'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { Exercise } from '@/types/database'

const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core']

function mapDbMuscleGroupToCategory(mg: string): string {
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
  const [activeTab,   setActiveTab]   = useState('All')

  const filteredExercises = useMemo(() => {
    return initialExercises.filter((ex) => {
      if (!ex.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      if (activeTab !== 'All' && mapDbMuscleGroupToCategory(ex.muscle_group) !== activeTab) return false
      return true
    })
  }, [initialExercises, searchQuery, activeTab])

  return (
    <div className="flex flex-col h-full">
      <div
        className="sticky top-0 z-10 pb-4 pt-4 px-4 space-y-3"
        style={{
          background: 'rgba(6,7,13,0.90)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        {!hideTitle && (
          <div>
            <p className="t-label mb-0.5">Library</p>
            <h1 className="t-display-m">Exercises</h1>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-faint)' }} />
          <input
            placeholder="Search exercises..."
            className="w-full h-11 pl-9 pr-4 rounded-[var(--radius-inner)] text-sm focus:outline-none transition-colors"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-hi)',
            }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 items-center no-scrollbar">
          {MUSCLE_GROUPS.map((mg) => (
            <button
              key={mg}
              onClick={() => setActiveTab(mg)}
              className="whitespace-nowrap h-8 px-3 rounded-[var(--radius-pill)] text-[11px] font-medium uppercase tracking-wider transition-colors shrink-0"
              style={activeTab === mg
                ? { background: 'var(--accent)', color: 'var(--accent-on)' }
                : { background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'var(--text-faint)' }
              }
            >
              {mg}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 pb-24 overflow-y-auto">
        <div className="space-y-2">
          {filteredExercises.length === 0 ? (
            <p className="t-caption text-center mt-8">No exercises found.</p>
          ) : (
            filteredExercises.map((ex) => (
              <Link href={`/exercises/${ex.id}`} key={ex.id}>
                <div
                  className="flex items-center justify-between px-4 py-3.5 rounded-[var(--radius-inner)] transition-all active:scale-[0.98] mb-2 hover:opacity-90"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <div>
                    <p className="font-semibold uppercase tracking-tight text-sm" style={{ color: 'var(--text-hi)' }}>
                      {ex.name}
                    </p>
                    <p className="t-caption mt-0.5 capitalize">
                      {ex.muscle_group}{ex.equipment ? ` · ${ex.equipment}` : ''}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-faint)' }} />
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'
import { Search, ChevronRight, Plus } from 'lucide-react'
import { Button, Card, Input, ToggleChip } from '@/components/ui'
import Link from 'next/link'
import { Exercise } from '@/types/database'
import { CreateExerciseModal } from '@/components/exercises/CreateExerciseModal'

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
  const [searchQuery,      setSearchQuery]      = useState('')
  const [activeTab,        setActiveTab]        = useState('All')
  const [createModalOpen,  setCreateModalOpen]  = useState(false)

  const filteredExercises = useMemo(() => {
    return initialExercises.filter((ex) => {
      if (!ex.name.toLowerCase().includes(searchQuery.toLowerCase())) return false

      if (activeTab !== 'All') {
        const primaryCategory   = mapDbMuscleGroupToCategory(ex.muscle_group)
        const secondaryMatches  = (ex.secondary_muscles ?? []).some(
          sm => mapDbMuscleGroupToCategory(sm) === activeTab
        )
        if (primaryCategory !== activeTab && !secondaryMatches) return false
      }

      return true
    })
  }, [initialExercises, searchQuery, activeTab])

  return (
    <div className="flex flex-col h-full">
      <div
        className="sticky top-0 z-10 pb-4 pt-4 px-4 space-y-3 bg-bg border-b border-border">
        {!hideTitle && (
          <div>
            <p className="t-label mb-0.5">Library</p>
            <h1 className="t-display-m">Exercises</h1>
          </div>
        )}

        <Button onClick={() => setCreateModalOpen(true)} leadingIcon={<Plus className="w-4 h-4" />}>
          Create exercise
        </Button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" />
          <Input
            placeholder="Search exercises"
            className="pl-9 pr-4"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 items-center no-scrollbar">
          {MUSCLE_GROUPS.map((mg) => (
            <ToggleChip
              key={mg}
              size="sm"
              selected={activeTab === mg}
              onClick={() => setActiveTab(mg)}
              className="whitespace-nowrap shrink-0"
            >
              {mg}
            </ToggleChip>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 pb-28 overflow-y-auto">
        {filteredExercises.length === 0 ? (
          <p className="t-body-sm mt-8 text-center">No exercises match. Try another search or muscle.</p>
        ) : (
          <Card padding="none">
            <ul>
              {filteredExercises.map((ex, index) => (
                <li key={ex.id} className={index > 0 ? 'border-t border-border' : undefined}>
                  <Link href={`/exercises/${ex.id}`} className="focus-ring flex min-h-14 items-center justify-between gap-2 px-4 py-2">
                    <span className="min-w-0">
                      <span className="t-body block truncate">{ex.name}</span>
                      <span className="t-caption block truncate capitalize">
                        {ex.muscle_group}
                        {ex.secondary_muscles && ex.secondary_muscles.length > 0
                          ? ` · ${ex.secondary_muscles.slice(0, 2).join(', ')}`
                          : ''}
                        {ex.equipment ? ` · ${ex.equipment}` : ''}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-tertiary" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>

      <CreateExerciseModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  )
}

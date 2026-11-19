'use client'

import { useState } from 'react'
import { BodyMap } from '@/components/ui/BodyMap'
import {
  calculateSessionSets,
  toHeatLevel,
  toRegionValues,
  type BodyRegion,
  type SessionExerciseInput,
} from '@/lib/body-map'
import { formatSetCount } from '@/lib/muscle-sets'
import type { MuscleGroup } from '@/types/database'

interface WorkoutBodyMapCardProps {
  exercises: SessionExerciseInput[]
}

interface RegionMuscle {
  muscleGroup: MuscleGroup
  sets: number
}

// A shared region shows the muscle that received more sets.
function pickMoreSets(a: RegionMuscle, b: RegionMuscle): RegionMuscle {
  return b.sets > a.sets ? b : a
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function WorkoutBodyMapCard({ exercises }: WorkoutBodyMapCardProps) {
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null)

  const setsByMuscle = calculateSessionSets(exercises)
  const regionMuscles = toRegionValues(
    Object.fromEntries(
      Object.entries(setsByMuscle).map(([muscleGroup, sets]) => [muscleGroup, { muscleGroup, sets }]),
    ),
    pickMoreSets,
  )
  const maxSets = Math.max(0, ...Object.values(regionMuscles).map(({ sets }) => sets))
  const regionEntries = Object.entries(regionMuscles)
  const fills = Object.fromEntries(regionEntries.map(([region]) => [region, 'var(--accent)']))
  const opacities = Object.fromEntries(
    regionEntries.map(([region, { sets }]) => [region, toHeatLevel(sets / maxSets)]),
  )

  const selected = selectedRegion ? regionMuscles[selectedRegion] : undefined
  const caption = selected
    ? `${capitalise(selected.muscleGroup)} · ${formatSetCount(selected.sets)} ${selected.sets === 1 ? 'set' : 'sets'}`
    : regionEntries.length === 0
      ? 'No working sets in this workout.'
      : 'Tap a muscle for details.'

  return (
    <div className="glass p-4 flex flex-col items-center">
      <p className="t-label self-start mb-2">Muscles worked</p>
      <BodyMap
        fills={fills}
        opacities={opacities}
        onRegionClick={setSelectedRegion}
        className="h-[220px] w-full"
        aria-label="Muscles worked in this workout"
      />
      <p className="t-caption text-center mt-2 min-h-[1.25rem]" aria-live="polite">
        {caption}
      </p>
    </div>
  )
}

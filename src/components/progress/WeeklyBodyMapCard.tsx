'use client'

import { useState } from 'react'
import { BodyMap } from '@/components/ui/BodyMap'
import { toRegionValues, trainedStatusByMuscle, type BodyRegion } from '@/lib/body-map'
import type { MuscleVolumeLandmarkPoint } from '@/lib/data/phase-coach'
import { formatSetCount } from '@/lib/muscle-sets'
import type { VolumeStatus } from '@/lib/phase-coach'
import type { MuscleGroup } from '@/types/database'
import { STATUS_PRIORITY, VOLUME_STATUS_STYLES } from './volume-status-styles'

interface WeeklyBodyMapCardProps {
  volumeLandmarks: MuscleVolumeLandmarkPoint[]
}

interface RegionMuscle {
  muscleGroup: MuscleGroup
  status: VolumeStatus
}

// Lower priority number = needs more attention, so a shared region shows the
// muscle that is in the worst shape.
function pickByPriority(a: RegionMuscle, b: RegionMuscle): RegionMuscle {
  return STATUS_PRIORITY[b.status] < STATUS_PRIORITY[a.status] ? b : a
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function WeeklyBodyMapCard({ volumeLandmarks }: WeeklyBodyMapCardProps) {
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion | null>(null)

  const statusByMuscle = trainedStatusByMuscle(volumeLandmarks)
  const regionMuscles = toRegionValues(
    Object.fromEntries(
      Object.entries(statusByMuscle).map(([muscleGroup, status]) => [muscleGroup, { muscleGroup, status }]),
    ),
    pickByPriority,
  )
  const fills = Object.fromEntries(
    Object.entries(regionMuscles).map(([region, { status }]) => [region, VOLUME_STATUS_STYLES[status].fill]),
  )
  const presentStatuses = [...new Set(Object.values(statusByMuscle))].sort(
    (a, b) => STATUS_PRIORITY[a] - STATUS_PRIORITY[b],
  )

  const selected = selectedRegion ? regionMuscles[selectedRegion] : undefined
  const selectedSetCount = selected
    ? volumeLandmarks.find(point => point.muscleGroup === selected.muscleGroup)?.setCount ?? 0
    : 0

  return (
    <div className="card p-4 flex flex-col items-center">
      <BodyMap
        fills={fills}
        onRegionClick={setSelectedRegion}
        className="h-[260px] w-full"
        aria-label="Weekly muscle volume body map"
      />
      <p className="t-caption text-center mt-2 min-h-[1.25rem]" aria-live="polite">
        {selected
          ? `${capitalise(selected.muscleGroup)} · ${formatSetCount(selectedSetCount)} ${selectedSetCount === 1 ? 'set' : 'sets'} · ${VOLUME_STATUS_STYLES[selected.status].label}`
          : presentStatuses.length === 0
            ? 'No working sets logged this week yet.'
            : 'Tap a muscle for details.'}
      </p>
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
        {presentStatuses.map(status => (
          <li key={status} className="flex items-center gap-1.5 t-caption">
            <span className={`h-2 w-2 rounded-full ${VOLUME_STATUS_STYLES[status].dot}`} aria-hidden />
            {VOLUME_STATUS_STYLES[status].label}
          </li>
        ))}
      </ul>
    </div>
  )
}

import { BodyMap } from '@/components/ui/BodyMap'
import {
  calculateSessionIntensity,
  toHeatLevel,
  toRegionValues,
  type SessionExerciseInput,
} from '@/lib/body-map'

interface SessionBodyMapProps {
  exercises: SessionExerciseInput[]
}

const TRAINED_FILL = 'var(--accent)'

export function SessionBodyMap({ exercises }: SessionBodyMapProps) {
  const intensityByMuscle = calculateSessionIntensity(exercises)
  const intensityByRegion = toRegionValues(intensityByMuscle, Math.max)

  const regionEntries = Object.entries(intensityByRegion)
  const fills = Object.fromEntries(regionEntries.map(([region]) => [region, TRAINED_FILL]))
  const opacities = Object.fromEntries(
    regionEntries.map(([region, intensity]) => [region, toHeatLevel(intensity)]),
  )
  const trainedMuscles = Object.keys(intensityByMuscle)

  return (
    <>
      <BodyMap fills={fills} opacities={opacities} className="h-16 w-16 shrink-0" />
      {trainedMuscles.length > 0 && (
        <span className="sr-only">Trained: {trainedMuscles.join(', ')}</span>
      )}
    </>
  )
}

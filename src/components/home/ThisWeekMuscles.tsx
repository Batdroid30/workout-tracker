import { SectionHeader } from '@/components/ui'
import { WeeklyBodyMapCard } from '@/components/progress/WeeklyBodyMapCard'
import type { MuscleVolumeLandmarkPoint } from '@/lib/data/phase-coach'

// What's been trained this week, next to what to train today.
export function ThisWeekMuscles({ volumeLandmarks }: { volumeLandmarks: MuscleVolumeLandmarkPoint[] }) {
  return (
    <section>
      <SectionHeader title={'This week’s muscles'} action={{ label: 'Details', href: '/progress/more' }} />
      <div className="mt-3">
        <WeeklyBodyMapCard volumeLandmarks={volumeLandmarks} />
      </div>
    </section>
  )
}

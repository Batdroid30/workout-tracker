import { requireAuth } from '@/lib/auth'
import { getWorkoutHistoryPage } from '@/lib/data/workouts'
import { BackButton } from '@/components/ui/BackButton'
import { WorkoutHistoryList } from '@/components/workout/WorkoutHistoryList'
import { loadMoreWorkoutsAction } from '../profile/actions'

export default async function HistoryPage() {
  const { userId } = await requireAuth()
  const { workouts, hasMore } = await getWorkoutHistoryPage(userId, null)

  return (
    <div className="min-h-screen px-5 pt-4 pb-28">
      <div className="-ml-2 mb-2">
        <BackButton fallbackHref="/progress" />
      </div>
      <h1 className="t-title-1 mb-5">History</h1>
      <WorkoutHistoryList workouts={workouts} initialHasMore={hasMore} onLoadMore={loadMoreWorkoutsAction} />
    </div>
  )
}

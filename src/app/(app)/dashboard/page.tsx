import { requireAuth } from '@/lib/auth'
import { getHomeData } from '@/lib/data/home'
import { greetingFor, homeDateLabel } from '@/lib/home'
import { HomeHeader } from '@/components/home/HomeHeader'
import { TodayCard } from '@/components/home/TodayCard'
import { ThisWeekStats } from '@/components/home/ThisWeekStats'
import { CoachNoteCard } from '@/components/home/CoachNoteCard'
import { LatestHighlight } from '@/components/home/LatestHighlight'

export default async function DashboardPage() {
  const { userId, session } = await requireAuth()
  const { model, suggestion, routines, profile, missedWeeks } = await getHomeData(userId)

  const email = session?.user?.email ?? ''
  const firstName = profile?.first_name ?? (email.split('@')[0] || 'athlete')
  const now = new Date()

  return (
    <div className="min-h-screen px-5 pb-28 max-w-[600px] mx-auto space-y-5">
      <HomeHeader
        greeting={greetingFor(now.getHours())}
        firstName={firstName}
        dateLabel={homeDateLabel(now)}
        avatarUrl={profile?.avatar_url ?? null}
        initial={(email[0] ?? 'U').toUpperCase()}
      />
      <TodayCard suggestion={suggestion} routines={routines} weekLabel={model.weekLabel} trainingPhase={profile?.training_phase ?? null} />
      <ThisWeekStats
        workoutsDone={model.workoutsDone}
        workoutsGoal={model.workoutsGoal}
        volumeTonnes={model.volumeTonnes}
        readiness={model.readiness}
      />
      {model.coachNote && <CoachNoteCard note={model.coachNote} missedWeeks={missedWeeks} />}
      {model.highlight && <LatestHighlight highlight={model.highlight} />}
    </div>
  )
}

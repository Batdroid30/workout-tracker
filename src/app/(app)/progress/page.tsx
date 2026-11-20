import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { Card } from '@/components/ui'
import { getProfile } from '@/lib/data/profile'
import { getProgressSnapshot } from '@/lib/data/progress-snapshot'
import { getStrengthLifts } from '@/lib/data/strength-lifts'
import { computeStrengthIndex } from '@/lib/data/phase-coach'
import { getRecentPRs, getWorkoutCalendarData } from '@/lib/data/insights'
import { getBodyweightHistory } from '@/lib/data/bodyweight'
import { liftTrend } from '@/lib/tracked-lifts'
import { bodyweightTrend, workoutsInMonth } from '@/lib/progress-overview'
import { YourLiftsCard } from '@/components/progress/YourLiftsCard'
import { ProgressTiles } from '@/components/progress/ProgressTiles'
import { CoachingSection } from '@/components/progress/CoachingSection'

export const metadata = {
  title: 'Progress | Lifts',
  description: 'Are you getting stronger?',
}

const PR_WINDOW_DAYS = 30
const BODYWEIGHT_WEEKS = 4

const LINKS = [
  { href: '/history', label: 'Workout history', hint: "Every session you've logged" },
  { href: '/exercises', label: 'All exercises', hint: 'Your library and per-lift pages' },
  { href: '/progress/more', label: 'More stats', hint: 'Consistency, volume, balance, body' },
] as const

export default async function ProgressPage() {
  const { userId } = await requireAuth()
  const [profile, snapshot, strengthLifts, recentPRs, calendar, bodyweight] = await Promise.all([
    getProfile(userId),
    getProgressSnapshot(userId),
    getStrengthLifts(userId),
    getRecentPRs(userId, PR_WINDOW_DAYS),
    getWorkoutCalendarData(userId),
    getBodyweightHistory(userId, BODYWEIGHT_WEEKS),
  ])

  const rows = strengthLifts.lifts.map(lift => ({
    exerciseId: lift.exerciseId,
    name: lift.exerciseName,
    trend: liftTrend(snapshot.exerciseWeeklyE1RM.get(lift.exerciseId)),
  }))
  const strengthIndex = computeStrengthIndex(snapshot.exerciseWeeklyE1RM, strengthLifts.indexLifts, profile)

  return (
    <div className="min-h-screen p-5 pb-28">
      <header className="pt-4 mb-6">
        <p className="t-label mb-1.5">Progress</p>
        <h1 className="t-display-m">Getting stronger</h1>
      </header>

      <div className="space-y-5">
        <YourLiftsCard rows={rows} source={strengthLifts.source} action={null} />

        <ProgressTiles
          strengthPctPerWeek={strengthIndex.pctPerWeek}
          indexLiftCount={strengthLifts.indexLifts.length}
          prsThisMonth={recentPRs.length}
          workoutsThisMonth={workoutsInMonth(calendar.calendarEntries, new Date())}
          streakWeeks={calendar.currentStreak}
          bodyweight={bodyweightTrend(bodyweight)}
        />

        <CoachingSection userId={userId} />

        <Card padding="none" as="section" aria-label="More progress">
          {LINKS.map((link, index) => (
            <Link
              key={link.href}
              href={link.href}
              className={`focus-ring flex min-h-14 items-center justify-between gap-3 px-4 py-3 ${index > 0 ? 'border-t border-border' : ''}`}
            >
              <span className="min-w-0">
                <span className="t-body block">{link.label}</span>
                <span className="t-caption block truncate">{link.hint}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-tertiary" aria-hidden="true" />
            </Link>
          ))}
        </Card>
      </div>
    </div>
  )
}

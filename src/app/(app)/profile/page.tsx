import { auth } from '@/lib/auth'
import { getProfile } from '@/lib/data/profile'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ProfileContent } from '@/components/profile/ProfileContent'
import { ProfileForm } from './ProfileForm'
import { ExerciseListClient } from '@/app/(app)/exercises/ExerciseListClient'
import { getAllWorkouts } from '@/lib/data/workouts'
import { getExercises } from '@/lib/data/exercises'
import { WorkoutHistoryList } from '@/components/workout/WorkoutHistoryList'
import { User } from 'lucide-react'
import { ClearDataButton } from '@/components/profile/ClearDataButton'

type Tab = 'history' | 'exercises' | 'account'

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id
  const accessToken = session.supabaseAccessToken as string | undefined
  const { tab: rawTab } = await searchParams
  const VALID_TABS: Tab[] = ['history', 'exercises', 'account']
  const tab: Tab = VALID_TABS.includes(rawTab as Tab) ? (rawTab as Tab) : 'history'

  const profile = await getProfile(userId, accessToken)

  return (
    <div className="min-h-screen pb-24">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="pt-4 px-5 pb-3">
        <div className="t-label mb-1.5">Profile</div>
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-[var(--radius-inner)] overflow-hidden flex items-center justify-center shrink-0"
            style={{ background: 'var(--bg-2)', border: '2px solid var(--accent-line)' }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-7 h-7" style={{ color: 'var(--text-faint)' }} />
            )}
          </div>
          <div>
            <h1 className="t-display-m">
              {profile?.first_name
                ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`
                : 'Your Profile'}
            </h1>
            <p className="t-caption mt-0.5">{session.user.email}</p>
          </div>
        </div>
      </div>

      {/* ── Tab bar + content (client component handles instant skeleton) ── */}
      <ProfileContent activeTab={tab}>
        {/* Suspense lets RSC stream — ProfileContent already shows the skeleton */}
        <Suspense fallback={null}>
          {tab === 'history'   && <HistoryTab userId={userId} accessToken={accessToken} />}
          {tab === 'exercises' && <ExercisesTab accessToken={accessToken} />}
          {tab === 'account'   && <ProfileForm profile={profile} userEmail={session.user.email || ''} />}
        </Suspense>
      </ProfileContent>
    </div>
  )
}

async function HistoryTab({ userId, accessToken }: { userId: string; accessToken?: string }) {
  const workouts = await getAllWorkouts(userId, accessToken)

  return (
    <div className="space-y-3">
      <div className="flex justify-end pb-2">
        <ClearDataButton />
      </div>
      <WorkoutHistoryList workouts={workouts as any} />
    </div>
  )
}

async function ExercisesTab({ accessToken }: { accessToken?: string }) {
  const exercises = await getExercises(accessToken)
  return (
    <div className="-mx-5">
      <ExerciseListClient initialExercises={exercises} hideTitle />
    </div>
  )
}


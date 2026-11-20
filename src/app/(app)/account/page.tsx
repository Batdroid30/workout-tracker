import { User } from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { getProfile } from '@/lib/data/profile'
import { BackButton } from '@/components/ui/BackButton'
import { ClearDataButton } from '@/components/profile/ClearDataButton'
import { ProfileForm } from '../profile/ProfileForm'
import { getTrainingCycle } from '@/lib/data/training-cycle'
import { TrainingCycleSection } from '@/components/account/TrainingCycleSection'

export default async function AccountPage() {
  const { userId, session } = await requireAuth()
  const [profile, trainingCycle] = await Promise.all([getProfile(userId), getTrainingCycle(userId)])
  const displayName = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? ` ${profile.last_name}` : ''}`
    : 'Your account'

  return (
    <div className="min-h-screen px-5 pt-4 pb-28">
      <div className="-ml-2 mb-2">
        <BackButton fallbackHref="/dashboard" />
      </div>

      <header className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-control overflow-hidden flex items-center justify-center shrink-0 bg-surface-raised border-2 border-border-strong">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <User className="w-7 h-7 text-tertiary" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="t-title-1 truncate">{displayName}</h1>
          <p className="t-caption mt-0.5 truncate">{session.user.email}</p>
        </div>
      </header>

      <ProfileForm profile={profile} userEmail={session.user.email || ''} />

      <TrainingCycleSection cycle={trainingCycle} hasPhase={Boolean(profile?.phase_started_at)} />

      <section className="mt-10 pt-6 border-t border-border">
        <h2 className="t-label mb-3">Danger zone</h2>
        <ClearDataButton />
      </section>
    </div>
  )
}

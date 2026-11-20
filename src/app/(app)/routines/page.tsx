import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRoutines } from '@/lib/data/routines'
import { getProfile } from '@/lib/data/profile'
import { RoutineCard } from '@/components/routines/RoutineCard'
import { Plus, Zap } from 'lucide-react'
import { getButtonClassName } from '@/components/ui'
import Link from 'next/link'
import { StartEmptyWorkout } from '@/components/workout/StartEmptyWorkout'

export const metadata = {
  title: 'Workout | Lifts',
  description: 'Start a session or pick a routine',
}

export default async function RoutinesPage() {
  const {  session } = await requireAuth()

  const [routines, profile] = await Promise.all([
    getRoutines(session.user.id),
    getProfile(session.user.id),
  ])

  return (
    <div className="min-h-screen p-5 pb-36">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="pt-4 mb-7">
        <div className="t-label mb-1.5">Workout</div>
        <h1 className="t-display-l">
          Train<span className="italic">.</span>
        </h1>
      </div>

      {/* ── Start empty session CTA ────────────────────────────── */}
      <div className="mb-7">
        <StartEmptyWorkout trainingPhase={profile?.training_phase ?? null} />
      </div>

      {/* ── Routines section ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="t-display-s">Routines</h2>
          <Link
            href="/routines/create"
            className={getButtonClassName({ variant: 'secondary', size: 'sm', fullWidth: false })}
          >
            <Plus className="w-3 h-3" /> New
          </Link>
        </div>

        {routines.length === 0 ? (
          <div className="card border-dashed p-8 text-center">
            <div className="w-12 h-12 rounded-pill bg-surface-raised flex items-center justify-center mx-auto mb-4">
              <Zap className="w-5 h-5 text-secondary" />
            </div>
            <p className="text-sm font-medium text-primary mb-1">No routines yet</p>
            <p className="t-caption mb-5">Save a template to speed up future sessions.</p>
            <Link
              href="/routines/create"
              className={getButtonClassName({ fullWidth: false })}
            >
              <Plus className="w-3.5 h-3.5" /> Create routine
            </Link>
          </div>
        ) : (
          <div className="space-y-3 stagger-children">
            {routines.map(routine => (
              <div key={routine.id} className="fade-up">
                <RoutineCard routine={routine} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRoutines } from '@/lib/data/routines'
import { RoutineCard } from '@/components/routines/RoutineCard'
import { Plus, Zap } from 'lucide-react'
import Link from 'next/link'
import { StartEmptyWorkout } from '@/components/workout/StartEmptyWorkout'

export const metadata = {
  title: 'Workout | Lifts',
  description: 'Start a session or pick a routine',
}

export default async function RoutinesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const routines = await getRoutines(session.user.id)

  return (
    <div className="min-h-screen p-5 pb-36">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="pt-4 mb-7">
        <div className="t-label mb-1.5">Workout</div>
        <h1 className="t-display-l">
          Train<span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>.</span>
        </h1>
      </div>

      {/* ── Start empty session CTA ────────────────────────────── */}
      <div className="mb-7">
        <StartEmptyWorkout />
      </div>

      {/* ── Routines section ───────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="t-display-s">Routines</h2>
          <Link
            href="/routines/create"
            className="flex items-center gap-1.5 h-8 px-3 rounded-full text-[10px] font-medium uppercase tracking-widest bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent-line)] hover:bg-[var(--accent-line)] transition-colors"
          >
            <Plus className="w-3 h-3" /> New
          </Link>
        </div>

        {routines.length === 0 ? (
          <div className="glass border-dashed p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[var(--accent-soft)] border border-[var(--accent-line)] flex items-center justify-center mx-auto mb-4">
              <Zap className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <p className="text-[14px] font-medium text-[var(--text-hi)] mb-1">No routines yet</p>
            <p className="t-caption mb-5">Save a template to speed up future sessions.</p>
            <Link
              href="/routines/create"
              className="inline-flex items-center gap-2 h-10 px-5 rounded-[var(--radius-pill)] bg-[var(--accent)] text-[var(--accent-on)] text-[11px] font-semibold uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              <Plus className="w-3.5 h-3.5" /> Create Routine
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {routines.map(routine => (
              <RoutineCard key={routine.id} routine={routine} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRoutines } from '@/lib/data/routines'
import { RoutineCard } from '@/components/routines/RoutineCard'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Routines | Lifts',
  description: 'Manage your workout templates',
}

export default async function RoutinesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const routines = await getRoutines(session.user.id)

  return (
    <div className="max-w-md mx-auto w-full pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-zinc-900 p-4">
        <h1 className="text-2xl font-black italic uppercase tracking-tight text-white mb-1">Routines</h1>
        <p className="text-zinc-400 text-sm">Your saved workout templates</p>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {routines.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 text-center mt-4">
            <h3 className="text-lg font-bold text-white mb-2">No Routines Yet</h3>
            <p className="text-zinc-400 mb-6 text-sm">Create your first template to speed up your workouts.</p>
            <Link 
              href="/routines/create"
              className="inline-flex items-center justify-center bg-brand text-white font-bold py-3 px-6 rounded-xl hover:bg-brand-hover transition-colors"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Routine
            </Link>
          </div>
        ) : (
          <>
            <Link 
              href="/routines/create"
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-zinc-800 rounded-2xl text-brand font-bold hover:bg-zinc-900 transition-colors mb-6"
            >
              <Plus className="w-5 h-5" /> New Routine
            </Link>

            <div className="space-y-4">
              {routines.map(routine => (
                <RoutineCard key={routine.id} routine={routine} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

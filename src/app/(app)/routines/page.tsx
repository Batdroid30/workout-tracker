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
    <div className="max-w-md mx-auto w-full pb-24 bg-[#070d1f] min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#070d1f]/95 backdrop-blur border-b border-[#334155] px-4 py-4">
        <p className="text-[10px] font-black tracking-[0.2em] uppercase text-[#4a5568] mb-0.5">Your Templates</p>
        <h1 className="text-xl font-black uppercase tracking-tight text-white">Routines</h1>
      </div>

      <div className="p-4 space-y-4">
        {routines.length === 0 ? (
          <div className="glass-panel border border-[#334155] rounded-xl p-8 text-center mt-4">
            <h3 className="text-base font-black uppercase text-white mb-2 tracking-tight">No Routines Yet</h3>
            <p className="text-[#4a5568] mb-6 text-sm font-body">Create your first template to speed up your workouts.</p>
            <Link
              href="/routines/create"
              className="inline-flex items-center justify-center bg-[#CCFF00] text-[#020617] font-black py-3 px-6 rounded-xl hover:bg-[#abd600] transition-colors uppercase tracking-widest text-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Routine
            </Link>
          </div>
        ) : (
          <>
            <Link
              href="/routines/create"
              className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-[#334155] rounded-xl text-[#CCFF00] font-black hover:bg-[#151b2d] transition-colors text-xs uppercase tracking-widest"
            >
              <Plus className="w-4 h-4" /> New Routine
            </Link>

            <div className="space-y-3">
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

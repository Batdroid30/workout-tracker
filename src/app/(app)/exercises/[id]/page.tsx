import { getExerciseById, getRecentSetsForExercise } from '@/lib/data/exercises'
import { notFound } from 'next/navigation'

export default async function ExerciseDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const exercise = await getExerciseById(id)
  
  if (!exercise) {
    notFound()
  }

  const recentSets = await getRecentSetsForExercise(id)
  
  return (
    <div className="p-4 bg-black min-h-screen text-white">
      <h1 className="text-3xl font-bold font-sans mb-1">{exercise.name}</h1>
      <p className="text-zinc-500 font-mono text-sm mb-8 uppercase tracking-widest">
        {exercise.muscle_group} {exercise.equipment ? `• ${exercise.equipment}` : ''}
      </p>
      
      <div className="space-y-8">
        <section>
          <h2 className="text-lg font-bold mb-4 font-sans text-zinc-300">Records</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <p className="text-sm text-zinc-400 font-medium">1RM (est)</p>
              <p className="text-2xl font-bold font-mono text-brand mt-1">
                {/* Placeholder until PR logic is fully implemented */}
                —
              </p>
            </div>
            <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
              <p className="text-sm text-zinc-400 font-medium">Best Volume</p>
              <p className="text-2xl font-bold font-mono text-brand mt-1">
                —
              </p>
            </div>
          </div>
        </section>
        
        <section>
          <h2 className="text-lg font-bold mb-4 font-sans text-zinc-300">History</h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-800/50">
            {recentSets.length === 0 ? (
              <div className="p-4 text-zinc-500 font-mono text-sm">No history yet.</div>
            ) : (
              recentSets.map((set: any) => (
                <div key={set.id} className="p-4">
                  <p className="text-sm font-bold text-white mb-3">
                    {new Date(set.completed_at).toLocaleDateString()}
                  </p>
                  <div className="flex font-mono text-base text-zinc-300">
                    <span className="w-8 text-zinc-600">{set.set_number}</span>
                    <span>{set.weight_kg} kg × {set.reps}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

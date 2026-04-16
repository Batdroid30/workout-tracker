'use client'
import { useWorkoutStore } from '@/store/workout.store'
import { SetLogger } from '@/components/workout/SetLogger'
import { Button } from '@/components/ui/Button'
import { Plus, Play } from 'lucide-react'

export default function WorkoutPage() {
  const { activeWorkout, startWorkout, finishWorkout } = useWorkoutStore()

  if (!activeWorkout) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] p-4 text-center bg-black text-white">
        <div className="w-20 h-20 bg-brand/10 border border-brand/20 rounded-full flex items-center justify-center mb-6">
          <Play className="w-8 h-8 text-brand ml-1" />
        </div>
        <h1 className="text-3xl font-bold font-sans mb-2">Ready to lift?</h1>
        <p className="text-zinc-500 mb-8 max-w-sm text-lg">Start a blank workout or choose a routine to crush your goals today.</p>
        <Button onClick={() => startWorkout('Back & Biceps (Mock)')} className="max-w-xs h-14 text-lg">Start Empty Workout</Button>
      </div>
    )
  }

  return (
    <div className="pb-32 min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-zinc-900 p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold font-sans text-white">{activeWorkout.title}</h1>
        <button onClick={() => finishWorkout()} className="text-sm font-bold text-red-500 bg-red-500/10 px-4 py-2 justify-center flex items-center rounded-lg active:scale-95 transition-transform">
          Finish
        </button>
      </div>

      <div className="p-4 space-y-2">
        {activeWorkout.exercises.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-zinc-500 font-mono">No exercises added yet.</p>
          </div>
        ) : (
          activeWorkout.exercises.map((ex, i) => (
            <SetLogger key={ex.exercise.id || i} exerciseIndex={i} exercise={ex} />
          ))
        )}
        
        <Button variant="secondary" className="border-dashed border-2 border-zinc-800 bg-transparent hover:bg-zinc-900 text-brand mt-4">
          <Plus className="w-5 h-5 mr-2" /> Add Exercise
        </Button>
      </div>
    </div>
  )
}

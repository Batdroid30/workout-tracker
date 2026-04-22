'use client'
import { useState } from 'react'
import { useWorkoutStore } from '@/store/workout.store'
import { SetLogger } from '@/components/workout/SetLogger'
import { Button } from '@/components/ui/Button'
import { Plus, Play, ChevronLeft } from 'lucide-react'
import { AddExerciseModal } from '@/components/workout/AddExerciseModal'
import { RestTimer } from '@/components/workout/RestTimer'
import { finishWorkoutAction } from './actions'
import { updateRoutineExercisesAction } from '@/app/(app)/routines/actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDialog } from '@/providers/DialogProvider'

export default function WorkoutPage() {
  const router = useRouter()
  const { activeWorkout, startWorkout, finishWorkout, discardWorkout, addExercise, updateTitle, completeAllSets } = useWorkoutStore()
  const dialog = useDialog()
  
  const handleDiscard = async () => {
    const confirmed = await dialog.confirm({
      title: 'Discard Workout',
      description: 'Are you sure you want to discard this workout? All progress will be lost.',
      danger: true,
      confirmText: 'Discard'
    })
    
    if (confirmed) {
      discardWorkout()
      router.push('/dashboard')
    }
  }
  const [addingExerciseMode, setAddingExerciseMode] = useState<{ mode: 'add' } | { mode: 'replace', index: number } | null>(null)
  const [showRestTimer, setShowRestTimer] = useState(false)
  const [restSeconds, setRestSeconds] = useState(90)
  const [isFinishing, setIsFinishing] = useState(false)

  const handleFinish = async () => {
    if (!activeWorkout) return
    
    // Check for empty workout
    if (activeWorkout.exercises.length === 0) {
      const confirmedEmpty = await dialog.confirm({
        title: 'Empty Workout',
        description: 'This workout is empty. Do you want to discard it?',
        danger: true,
        confirmText: 'Discard'
      })
      if (!confirmedEmpty) return
      discardWorkout()
      router.push('/dashboard')
      return
    }

    // Check for unchecked sets with data
    const hasUncheckedSetsWithData = activeWorkout.exercises.some(ex => 
      ex.sets.some(s => !s.completed && (s.weight_kg > 0 || s.reps > 0))
    )

    let finalWorkout = activeWorkout

    if (hasUncheckedSetsWithData) {
      const completeThem = await dialog.confirm({
        title: 'Unchecked Sets',
        description: 'You have unchecked sets with data. Would you like to mark them as complete and save them?',
        confirmText: 'Mark Complete'
      })
      
      if (completeThem) {
        completeAllSets()
        finalWorkout = {
          ...activeWorkout,
          exercises: activeWorkout.exercises.map(ex => ({
            ...ex,
            sets: ex.sets.map(s => (s.weight_kg > 0 || s.reps > 0) ? { ...s, completed: true } : s)
          }))
        }
      } else {
        const finishAnyway = await dialog.confirm({
          title: 'Finish Anyway?',
          description: 'Are you sure you want to finish? Unchecked sets will NOT be saved.',
          confirmText: 'Finish',
          danger: true
        })
        if (!finishAnyway) return
      }
    } else {
      const finishIt = await dialog.confirm({
        title: 'Finish Workout',
        description: 'Great job! Finish this workout and save to your log?',
        confirmText: 'Finish Workout'
      })
      if (!finishIt) return
    }

    setIsFinishing(true)
    try {
      // 1. Check if routine needs syncing
      if (finalWorkout.routine_id && finalWorkout.has_routine_been_modified) {
        const syncRoutine = await dialog.confirm({
          title: 'Update Routine?',
          description: `You modified the exercises in this routine. Would you like to permanently update the saved routine template to match these new exercises and target sets?`,
          confirmText: 'Update Routine'
        })
        
        if (syncRoutine) {
          await updateRoutineExercisesAction(finalWorkout.routine_id, finalWorkout.exercises)
        }
      }

      // 2. Save the workout
      const result = await finishWorkoutAction(finalWorkout)
      if (result.success) {
        finishWorkout()
        
        // Show PRs if any
        if (result.prs && result.prs.length > 0) {
          const prMessages = result.prs.map((pr: any) => {
            const prName = pr.prType === 'best_weight' ? 'Best Weight' : pr.prType === 'best_1rm' ? 'Best Est. 1RM' : 'Best Volume'
            return `• ${pr.exerciseName}: ${prName} (${pr.newValue})`
          }).join('\n')
          
          await dialog.alert({
            title: 'New Personal Records!',
            description: `You broke ${result.prs.length} PR(s):\n${prMessages}`
          })
        }
        
        router.push('/dashboard')
      } else {
        dialog.alert({ title: 'Error', description: 'Failed to save workout: ' + result.error })
      }
    } catch (err) {
      dialog.alert({ title: 'Error', description: 'An unexpected error occurred.' })
    } finally {
      setIsFinishing(false)
    }
  }

  if (!activeWorkout) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] p-4 text-center bg-black text-white">
        <div className="w-20 h-20 bg-brand/10 border border-brand/20 rounded-full flex items-center justify-center mb-6">
          <Play className="w-8 h-8 text-brand ml-1" />
        </div>
        <h1 className="text-3xl font-bold font-sans mb-2">Ready to lift?</h1>
        <p className="text-zinc-500 mb-8 max-w-sm text-lg">Start a blank workout or choose a routine to crush your goals today.</p>
        <Button onClick={() => startWorkout('Blank Workout')} className="max-w-xs h-14 text-lg">Start Blank Workout</Button>
      </div>
    )
  }

  return (
    <div className="pb-32 min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-zinc-900 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 mr-4">
          <Link href="/dashboard" className="p-1 hover:bg-zinc-900 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-zinc-400" />
          </Link>
          <input 
            type="text"
            value={activeWorkout.title}
            onChange={(e) => updateTitle(e.target.value)}
            placeholder="Workout Title"
            className="bg-transparent border-none text-xl font-bold font-sans text-white focus:ring-0 p-0 w-full placeholder:text-zinc-700 outline-none"
          />
        </div>
        <button 
          onClick={handleFinish}
          disabled={isFinishing}
          className="text-sm font-bold text-brand bg-brand/10 px-4 py-2 justify-center flex items-center rounded-lg active:scale-95 transition-transform disabled:opacity-50"
        >
          {isFinishing ? 'Saving...' : 'Finish'}
        </button>
      </div>

      <div className="p-4 space-y-2">
        {activeWorkout.exercises.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-zinc-900 rounded-3xl">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-zinc-700" />
            </div>
            <h2 className="text-zinc-400 font-bold mb-1">Your workout is empty</h2>
            <p className="text-zinc-600 text-sm">Add an exercise to start tracking.</p>
          </div>
        ) : (
          activeWorkout.exercises.map((ex, i) => (
            <SetLogger 
              key={ex.exercise.id || i} 
              exerciseIndex={i} 
              exercise={ex} 
              onSetCompleted={() => setShowRestTimer(true)}
              onReplaceExercise={() => setAddingExerciseMode({ mode: 'replace', index: i })}
            />
          ))
        )}
        
        <Button 
          variant="secondary" 
          onClick={() => setAddingExerciseMode({ mode: 'add' })}
          className="border-dashed border-2 border-zinc-800 bg-transparent hover:bg-zinc-900 text-brand mt-4 w-full h-14"
        >
          <Plus className="w-5 h-5 mr-2" /> Add Exercise
        </Button>

        <button 
          onClick={handleDiscard}
          className="w-full h-12 mt-8 text-sm font-bold text-red-500 hover:bg-red-500/5 rounded-xl transition-colors"
        >
          Discard Workout
        </button>
      </div>

      {showRestTimer && (
        <RestTimer 
          seconds={restSeconds} 
          onSkip={() => setShowRestTimer(false)} 
        />
      )}

      <AddExerciseModal 
        isOpen={addingExerciseMode !== null}
        onClose={() => setAddingExerciseMode(null)}
        onSelect={(exercise) => {
          if (addingExerciseMode?.mode === 'replace') {
            useWorkoutStore.getState().replaceExercise(addingExerciseMode.index, exercise)
          } else {
            addExercise(exercise)
          }
          setAddingExerciseMode(null)
        }}
      />
    </div>
  )
}


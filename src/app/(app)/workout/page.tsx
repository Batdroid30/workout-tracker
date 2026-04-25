'use client'
import { useState } from 'react'
import { useWorkoutStore } from '@/store/workout.store'
import { SetLogger } from '@/components/workout/SetLogger'
import { Button } from '@/components/ui/Button'
import { Plus, Play, ChevronLeft, Timer, X } from 'lucide-react'
import { useRestTimerDuration } from '@/hooks/useRestTimerDuration'
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
  const [showRestTimer,    setShowRestTimer]    = useState(false)
  const [restTimerKey,     setRestTimerKey]     = useState(0)
  const [showDurationPicker, setShowDurationPicker] = useState(false)
  const [isFinishing,      setIsFinishing]      = useState(false)
  const { seconds: restSeconds, updateSeconds: setRestSeconds } = useRestTimerDuration()

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
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] p-4 text-center bg-[#070d1f]">
        <div className="w-20 h-20 bg-[#CCFF00]/10 border border-[#CCFF00]/20 rounded-xl flex items-center justify-center mb-6">
          <Play className="w-8 h-8 text-[#CCFF00] ml-1" />
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight text-white mb-2">Ready to lift?</h1>
        <p className="text-[#4a5568] mb-8 max-w-sm font-body">Start a blank workout or choose a routine to crush your goals today.</p>
        <Button onClick={() => startWorkout('Blank Workout')} className="max-w-xs h-14 text-base">Start Blank Workout</Button>
      </div>
    )
  }

  return (
    <div className="pb-32 min-h-screen bg-[#070d1f]">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#070d1f]/95 backdrop-blur border-b border-[#334155] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 mr-4">
          <Link href="/dashboard" className="p-1 hover:bg-[#151b2d] rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-[#adb4ce]" />
          </Link>
          <input
            type="text"
            value={activeWorkout.title}
            onChange={(e) => updateTitle(e.target.value)}
            placeholder="Session Title"
            className="bg-transparent border-none text-base font-black uppercase tracking-tight text-white focus:ring-0 p-0 w-full placeholder:text-[#334155] outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Rest duration pill */}
          <button
            onClick={() => setShowDurationPicker(true)}
            className="flex items-center gap-1.5 h-8 px-3 bg-[#151b2d] border border-[#334155] rounded-lg hover:border-[#CCFF00]/40 transition-colors"
          >
            <Timer className="w-3 h-3 text-[#4a5568]" />
            <span className="text-[10px] font-black text-[#adb4ce] tabular-nums">
              {restSeconds >= 60
                ? `${Math.floor(restSeconds / 60)}:${String(restSeconds % 60).padStart(2, '0')}`
                : `${restSeconds}s`}
            </span>
          </button>

          <button
            onClick={handleFinish}
            disabled={isFinishing}
            className="text-[10px] font-black text-[#020617] bg-[#CCFF00] px-4 py-2 rounded-lg active:scale-95 transition-transform disabled:opacity-50 uppercase tracking-widest hover:bg-[#abd600]"
          >
            {isFinishing ? 'Saving...' : 'Finish'}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {activeWorkout.exercises.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[#1e293b] rounded-xl mt-4">
            <div className="w-14 h-14 bg-[#151b2d] rounded-xl flex items-center justify-center mx-auto mb-4">
              <Plus className="w-7 h-7 text-[#334155]" />
            </div>
            <h2 className="text-[#adb4ce] font-black uppercase tracking-wide text-sm mb-1">Workout is empty</h2>
            <p className="text-[#334155] text-xs font-body">Add an exercise to start tracking.</p>
          </div>
        ) : (
          activeWorkout.exercises.map((ex, i) => (
            <SetLogger
              key={ex.exercise.id || i}
              exerciseIndex={i}
              exercise={ex}
              onSetCompleted={() => { setRestTimerKey(k => k + 1); setShowRestTimer(true) }}
              onReplaceExercise={() => setAddingExerciseMode({ mode: 'replace', index: i })}
            />
          ))
        )}

        <Button
          variant="secondary"
          onClick={() => setAddingExerciseMode({ mode: 'add' })}
          className="border border-dashed border-[#334155] bg-transparent hover:bg-[#151b2d] text-[#CCFF00] mt-4 w-full h-12 text-xs"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Exercise
        </Button>

        <button
          onClick={handleDiscard}
          className="w-full h-10 mt-6 text-xs font-black text-red-500/60 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-colors uppercase tracking-widest"
        >
          Discard Workout
        </button>
      </div>

      {showRestTimer && (
        <RestTimer
          key={restTimerKey}
          seconds={restSeconds}
          onSkip={() => setShowRestTimer(false)}
          onComplete={() => setShowRestTimer(false)}
        />
      )}

      {/* Rest duration picker */}
      {showDurationPicker && (
        <RestDurationPicker
          current={restSeconds}
          onChange={(s) => { setRestSeconds(s); setShowDurationPicker(false) }}
          onClose={() => setShowDurationPicker(false)}
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

// ─── Rest Duration Picker ─────────────────────────────────────────────────────

const PRESETS = [
  { label: '30s',  seconds: 30  },
  { label: '1m',   seconds: 60  },
  { label: '1:30', seconds: 90  },
  { label: '2m',   seconds: 120 },
  { label: '3m',   seconds: 180 },
  { label: '5m',   seconds: 300 },
] as const

interface RestDurationPickerProps {
  current: number
  onChange: (seconds: number) => void
  onClose: () => void
}

function RestDurationPicker({ current, onChange, onClose }: RestDurationPickerProps) {
  const [custom, setCustom] = useState('')

  const handleCustomSubmit = () => {
    const parsed = parseInt(custom, 10)
    if (!isNaN(parsed) && parsed >= 10) onChange(parsed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-[#0c1324] border-t border-[#334155] rounded-t-2xl p-5 pb-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Timer className="w-4 h-4 text-[#CCFF00]" />
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Rest Duration</h2>
          </div>
          <button onClick={onClose} className="text-[#4a5568] hover:text-white p-1 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset grid */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {PRESETS.map(p => (
            <button
              key={p.seconds}
              onClick={() => onChange(p.seconds)}
              className={`py-3 rounded-xl font-black text-sm transition-all active:scale-95 border ${
                current === p.seconds
                  ? 'bg-[#CCFF00] text-[#020617] border-[#CCFF00]'
                  : 'bg-[#151b2d] text-[#adb4ce] border-[#334155] hover:border-[#CCFF00]/40'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom input */}
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder="Custom (seconds)"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
            className="flex-1 h-11 bg-[#151b2d] border border-[#334155] rounded-xl px-4 text-sm font-black text-white placeholder:text-[#334155] focus:outline-none focus:border-[#CCFF00]/50"
          />
          <button
            onClick={handleCustomSubmit}
            className="h-11 px-5 bg-[#CCFF00] text-[#020617] font-black text-sm rounded-xl active:scale-95 transition-transform hover:bg-[#abd600]"
          >
            Set
          </button>
        </div>
        <p className="text-[10px] text-[#334155] font-body mt-2">Enter any value in seconds (e.g. 45, 150)</p>
      </div>
    </div>
  )
}

'use client'
import { useState, useCallback, useEffect } from 'react'
import { useWorkoutStore } from '@/store/workout.store'
import { SetLogger } from '@/components/workout/SetLogger'
import { PlateCalculator } from '@/components/workout/PlateCalculator'
import { RestTimer } from '@/components/workout/RestTimer'
import { Button } from '@/components/ui/Button'
import { Plus, Play, ChevronLeft } from 'lucide-react'
import { AddExerciseModal } from '@/components/workout/AddExerciseModal'
import { PostWorkoutSummary } from '@/components/workout/PostWorkoutSummary'
import { SuggestNextChip } from '@/components/workout/SuggestNextChip'
import { useExerciseStore } from '@/store/exercise.store'
import { finishWorkoutAction, getUserExerciseFrequency } from './actions'
import { updateRoutineExercisesAction } from '@/app/(app)/routines/actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDialog } from '@/providers/DialogProvider'
import type { PREvaluationResult } from '@/lib/data/stats'

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
  const [isFinishing,      setIsFinishing]      = useState(false)
  // Snapshot of the workout + PRs at finish time, used to render the
  // post-workout summary screen. Cleared (→ null) on dashboard navigation.
  const [summary, setSummary] = useState<{
    workout: NonNullable<typeof activeWorkout>
    prs:     PREvaluationResult[]
  } | null>(null)

  // ── Plate calculator — owned here so it renders outside backdrop-filter cards ──
  const [plateCalc, setPlateCalc] = useState<{ isOpen: boolean; weight: number }>({ isOpen: false, weight: 100 })
  const handleOpenPlateCalc = useCallback((weight: number) => setPlateCalc({ isOpen: true, weight }), [])

  // ── Rest timer — owned here so fixed positioning is relative to the viewport ──
  const [restTimer, setRestTimer] = useState<{ isVisible: boolean; seconds: number; key: number }>({
    isVisible: false, seconds: 90, key: 0,
  })
  const handleRestTimerStart = useCallback((seconds: number) => {
    setRestTimer(prev => ({ isVisible: true, seconds, key: prev.key + 1 }))
  }, [])

  // ── Exercise cache + frequency map for "suggest next" ──────────────────
  // Both are fetched once per workout-page mount and reused for every chip
  // re-render. The exercise list is also localStorage-cached for 24h, so
  // this is effectively free after the first visit.
  const loadExerciseCache = useExerciseStore(s => s.load)
  const [usageFrequency, setUsageFrequency] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!activeWorkout) return
    loadExerciseCache()
    getUserExerciseFrequency().then(setUsageFrequency)
  // Only run once per workout session — frequency is a stable snapshot
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkout?.started_at])

  // ── Accordion state — used when starting from a routine ─────────────────
  // Routines load all exercises upfront, but rendering 5–8 expanded SetLoggers
  // is overwhelming. Show a collapsed summary list; one expanded at a time.
  // Blank workouts keep the legacy fully-expanded behaviour.
  const isRoutineWorkout = !!activeWorkout?.routine_id
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  // On routine start, auto-expand the first exercise that still has incomplete sets.
  useEffect(() => {
    if (!isRoutineWorkout || expandedIndex !== null || !activeWorkout) return
    const firstIncomplete = activeWorkout.exercises.findIndex(ex =>
      ex.sets.some(s => !s.completed)
    )
    setExpandedIndex(firstIncomplete >= 0 ? firstIncomplete : 0)
  }, [isRoutineWorkout, activeWorkout, expandedIndex])

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
        // Snapshot before clearing the active workout — the summary screen
        // needs the full exercise list (with completed sets) for its stats.
        setSummary({ workout: finalWorkout, prs: result.prs ?? [] })
        finishWorkout()
      } else {
        dialog.alert({ title: 'Error', description: 'Failed to save workout: ' + result.error })
      }
    } catch (err) {
      dialog.alert({ title: 'Error', description: 'An unexpected error occurred.' })
    } finally {
      setIsFinishing(false)
    }
  }

  // Post-workout summary takes priority over both the empty state and the
  // active workout view — finishWorkout() has already cleared activeWorkout.
  if (summary) {
    return (
      <PostWorkoutSummary
        workout={summary.workout}
        prs={summary.prs}
        onDone={() => {
          setSummary(null)
          router.push('/dashboard')
        }}
      />
    )
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
          <Link href="/dashboard" className="p-2 hover:bg-[#151b2d] rounded-lg transition-colors">
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
              onReplaceExercise={() => setAddingExerciseMode({ mode: 'replace', index: i })}
              onOpenPlateCalc={handleOpenPlateCalc}
              onRestTimerStart={handleRestTimerStart}
              // Accordion mode — only collapse for routine-driven workouts.
              isCollapsed={isRoutineWorkout && expandedIndex !== i}
              onExpand={() => setExpandedIndex(i)}
            />
          ))
        )}

        {/* Suggest-next chips — blank workouts only, after at least one exercise */}
        {!isRoutineWorkout && activeWorkout.exercises.length > 0 && (
          <SuggestNextChip
            workoutExercises={activeWorkout.exercises}
            usageFrequency={usageFrequency}
            onAdd={(ex) => addExercise(ex)}
          />
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

      <AddExerciseModal
        isOpen={addingExerciseMode !== null}
        onClose={() => setAddingExerciseMode(null)}
        onConfirm={(selected) => {
          if (addingExerciseMode?.mode === 'replace') {
            // Replace only accepts one exercise — use the first selection
            useWorkoutStore.getState().replaceExercise(addingExerciseMode.index, selected[0])
          } else {
            selected.forEach(ex => addExercise(ex))
          }
          setAddingExerciseMode(null)
        }}
      />


      {/*
        PlateCalculator and RestTimer live here — NOT inside SetLogger cards.
        SetLogger cards have `backdrop-filter` (glass-panel) which creates a new
        CSS containing block for fixed-position descendants, breaking full-screen
        overlays and bottom-docked timers. Rendering here ensures they are direct
        children of the root and position correctly against the viewport.
      */}
      <PlateCalculator
        isOpen={plateCalc.isOpen}
        onClose={() => setPlateCalc(p => ({ ...p, isOpen: false }))}
        initialWeight={plateCalc.weight}
      />

      {restTimer.isVisible && (
        <RestTimer
          key={restTimer.key}
          seconds={restTimer.seconds}
          onSkip={() => setRestTimer(p => ({ ...p, isVisible: false }))}
          onComplete={() => setRestTimer(p => ({ ...p, isVisible: false }))}
        />
      )}
    </div>
  )
}


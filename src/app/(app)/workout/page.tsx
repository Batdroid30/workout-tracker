'use client'
import { useState, useCallback, useEffect } from 'react'
import { useWorkoutStore } from '@/store/workout.store'
import { SetLogger } from '@/components/workout/SetLogger'
import { PlateCalculator } from '@/components/workout/PlateCalculator'
import { RestTimer } from '@/components/workout/RestTimer'
import { Plus, Dumbbell, ChevronLeft } from 'lucide-react'
import { AddExerciseModal } from '@/components/workout/AddExerciseModal'
import { PostWorkoutSummary } from '@/components/workout/PostWorkoutSummary'
import { SuggestNextChip } from '@/components/workout/SuggestNextChip'
import { useExerciseStore } from '@/store/exercise.store'
import { finishWorkoutAction, getUserExerciseFrequency } from './actions'
import { updateRoutineExercisesAction } from '@/app/(app)/routines/actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useDialog } from '@/providers/DialogProvider'
import { cn } from '@/lib/utils'
import type { PREvaluationResult } from '@/lib/data/stats'

export default function WorkoutPage() {
  const router = useRouter()
  const { activeWorkout, startWorkout, finishWorkout, discardWorkout, addExercise, updateTitle, completeAllSets } = useWorkoutStore()
  const dialog = useDialog()

  const handleDiscard = async () => {
    const confirmed = await dialog.confirm({
      title:       'Discard Workout',
      description: 'Are you sure you want to discard this workout? All progress will be lost.',
      danger:       true,
      confirmText: 'Discard',
    })
    if (confirmed) {
      discardWorkout()
      router.push('/dashboard')
    }
  }

  const [addingExerciseMode, setAddingExerciseMode] = useState<{ mode: 'add' } | { mode: 'replace', index: number } | null>(null)
  const [isFinishing,        setIsFinishing]        = useState(false)
  const [summary, setSummary] = useState<{
    workout: NonNullable<typeof activeWorkout>
    prs:     PREvaluationResult[]
  } | null>(null)

  // Plate calculator + rest timer state live here so they render outside
  // backdrop-filter cards (which break fixed positioning on WebKit).
  const [plateCalc, setPlateCalc] = useState<{ isOpen: boolean; weight: number }>({ isOpen: false, weight: 100 })
  const handleOpenPlateCalc = useCallback((weight: number) => setPlateCalc({ isOpen: true, weight }), [])

  const [restTimer, setRestTimer] = useState<{ isVisible: boolean; seconds: number; key: number }>({
    isVisible: false, seconds: 90, key: 0,
  })
  const handleRestTimerStart = useCallback((seconds: number) => {
    setRestTimer(prev => ({ isVisible: true, seconds, key: prev.key + 1 }))
  }, [])

  // Exercise cache + usage frequency for "suggest next" chips
  const loadExerciseCache = useExerciseStore(s => s.load)
  const [usageFrequency, setUsageFrequency] = useState<Record<string, number>>({})

  useEffect(() => {
    if (!activeWorkout) return
    loadExerciseCache()
    getUserExerciseFrequency().then(setUsageFrequency)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkout?.started_at])

  // Accordion for routine workouts — one exercise expanded at a time
  const isRoutineWorkout = !!activeWorkout?.routine_id
  const [expandedIndex,  setExpandedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!isRoutineWorkout || expandedIndex !== null || !activeWorkout) return
    const firstIncomplete = activeWorkout.exercises.findIndex(ex =>
      ex.sets.some(s => !s.completed)
    )
    setExpandedIndex(firstIncomplete >= 0 ? firstIncomplete : 0)
  }, [isRoutineWorkout, activeWorkout, expandedIndex])

  const handleFinish = async () => {
    if (!activeWorkout) return

    if (activeWorkout.exercises.length === 0) {
      const confirmedEmpty = await dialog.confirm({
        title: 'Empty Workout', description: 'This workout is empty. Do you want to discard it?',
        danger: true, confirmText: 'Discard',
      })
      if (!confirmedEmpty) return
      discardWorkout()
      router.push('/dashboard')
      return
    }

    const hasUncheckedSetsWithData = activeWorkout.exercises.some(ex =>
      ex.sets.some(s => !s.completed && (s.weight_kg > 0 || s.reps > 0))
    )
    let finalWorkout = activeWorkout

    if (hasUncheckedSetsWithData) {
      const completeThem = await dialog.confirm({
        title: 'Unchecked Sets',
        description: 'You have unchecked sets with data. Would you like to mark them as complete?',
        confirmText: 'Mark Complete',
      })
      if (completeThem) {
        completeAllSets()
        finalWorkout = {
          ...activeWorkout,
          exercises: activeWorkout.exercises.map(ex => ({
            ...ex,
            sets: ex.sets.map(s => (s.weight_kg > 0 || s.reps > 0) ? { ...s, completed: true } : s),
          })),
        }
      } else {
        const finishAnyway = await dialog.confirm({
          title: 'Finish Anyway?',
          description: 'Unchecked sets will NOT be saved.',
          confirmText: 'Finish', danger: true,
        })
        if (!finishAnyway) return
      }
    } else {
      const finishIt = await dialog.confirm({
        title: 'Finish Workout',
        description: 'Great job! Finish this workout and save to your log?',
        confirmText: 'Finish Workout',
      })
      if (!finishIt) return
    }

    setIsFinishing(true)
    try {
      if (finalWorkout.routine_id && finalWorkout.has_routine_been_modified) {
        const syncRoutine = await dialog.confirm({
          title: 'Update Routine?',
          description: 'You modified the exercises. Update the saved routine template?',
          confirmText: 'Update Routine',
        })
        if (syncRoutine) {
          await updateRoutineExercisesAction(finalWorkout.routine_id, finalWorkout.exercises)
        }
      }

      const result = await finishWorkoutAction(finalWorkout)
      if (result.success) {
        setSummary({ workout: finalWorkout, prs: result.prs ?? [] })
        finishWorkout()
        if (result.prError) {
          dialog.alert({
            title: 'Workout saved',
            description: 'Your workout was saved, but we couldn\'t check for personal records. They\'ll be picked up next time stats are recalculated.',
          })
        }
      } else {
        dialog.alert({ title: 'Error', description: 'Failed to save workout: ' + result.error })
      }
    } catch {
      dialog.alert({ title: 'Error', description: 'An unexpected error occurred.' })
    } finally {
      setIsFinishing(false)
    }
  }

  if (summary) {
    return (
      <PostWorkoutSummary
        workout={summary.workout}
        prs={summary.prs}
        onDone={() => { setSummary(null); router.push('/dashboard') }}
      />
    )
  }

  if (!activeWorkout) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] p-6 text-center">
        <div
          className="w-20 h-20 rounded-[var(--radius-card)] flex items-center justify-center mb-6"
          style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}
        >
          <Dumbbell className="w-8 h-8" style={{ color: 'var(--accent)' }} />
        </div>
        <h1 className="t-display-m mb-2">Ready to lift?</h1>
        <p className="t-body mb-8 max-w-xs">
          Start a blank session or pick a routine from the Workout tab.
        </p>
        <button
          onClick={() => startWorkout()}
          className="h-12 px-8 rounded-[var(--radius-pill)] text-[11px] font-semibold uppercase tracking-widest transition-all active:scale-95"
          style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}
        >
          Start Empty Session
        </button>
      </div>
    )
  }

  return (
    <div className="pb-32 min-h-screen">

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(6,7,13,0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        <div className="flex items-center gap-2 flex-1 mr-3">
          <Link href="/dashboard" className="p-2 -ml-1 rounded-[var(--radius-inner)] text-[var(--text-low)] hover:text-[var(--text-hi)] hover:bg-white/[0.06] transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <input
            type="text"
            value={activeWorkout.title}
            onChange={e => updateTitle(e.target.value)}
            placeholder="Session title"
            className="bg-transparent border-none text-[15px] font-semibold text-[var(--text-hi)] focus:ring-0 p-0 w-full placeholder:text-[var(--text-faint)] outline-none"
          />
        </div>
        <button
          onClick={handleFinish}
          disabled={isFinishing}
          className={cn(
            'h-9 px-4 rounded-[var(--radius-pill)] text-[11px] font-semibold uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50',
          )}
          style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}
        >
          {isFinishing ? 'Saving…' : 'Finish'}
        </button>
      </div>

      <div className="p-4 space-y-2">

        {/* ── Empty exercise state ──────────────────────────────────────── */}
        {activeWorkout.exercises.length === 0 ? (
          <div className="glass border-dashed text-center py-16 mt-4">
            <div
              className="w-14 h-14 rounded-[var(--radius-inner)] flex items-center justify-center mx-auto mb-4"
              style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }}
            >
              <Plus className="w-7 h-7" style={{ color: 'var(--accent)' }} />
            </div>
            <p className="text-[13px] font-medium text-[var(--text-hi)] mb-1">Workout is empty</p>
            <p className="t-caption">Add an exercise to start tracking.</p>
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
              isCollapsed={isRoutineWorkout && expandedIndex !== i}
              onExpand={() => setExpandedIndex(i)}
            />
          ))
        )}

        {/* ── Suggest-next chips — blank workouts only ──────────────────── */}
        {!isRoutineWorkout && activeWorkout.exercises.length > 0 && (
          <SuggestNextChip
            workoutExercises={activeWorkout.exercises}
            usageFrequency={usageFrequency}
            onAdd={ex => addExercise(ex)}
          />
        )}

        {/* ── Add exercise ──────────────────────────────────────────────── */}
        <button
          onClick={() => setAddingExerciseMode({ mode: 'add' })}
          className="w-full h-12 mt-4 rounded-[var(--radius-inner)] flex items-center justify-center gap-2 text-[11px] font-medium uppercase tracking-widest border border-dashed transition-colors"
          style={{
            borderColor: 'var(--accent-line)',
            color: 'var(--accent)',
            background: 'var(--accent-soft)',
          }}
        >
          <Plus className="w-4 h-4" /> Add Exercise
        </button>

        {/* ── Discard ───────────────────────────────────────────────────── */}
        <button
          onClick={handleDiscard}
          className="w-full h-10 mt-4 text-[11px] font-medium uppercase tracking-widest rounded-[var(--radius-inner)] transition-colors"
          style={{ color: 'var(--rose)' }}
        >
          Discard Workout
        </button>
      </div>

      <AddExerciseModal
        isOpen={addingExerciseMode !== null}
        onClose={() => setAddingExerciseMode(null)}
        onConfirm={selected => {
          if (addingExerciseMode?.mode === 'replace') {
            useWorkoutStore.getState().replaceExercise(addingExerciseMode.index, selected[0])
          } else {
            selected.forEach(ex => addExercise(ex))
          }
          setAddingExerciseMode(null)
        }}
      />

      {/*
        PlateCalculator and RestTimer live here — NOT inside SetLogger cards.
        backdrop-filter creates a new CSS containing block which breaks
        fixed-position children. Rendering here ensures viewport-level positioning.
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

'use client'
import React, { useState, useCallback, useEffect } from 'react'
import { useWorkoutStore } from '@/store/workout.store'
import { SetLogger } from '@/components/workout/SetLogger'
import { PlateCalculator } from '@/components/workout/PlateCalculator'
import { RestBar } from '@/components/workout/RestBar'
import { LoggerHeader } from '@/components/workout/LoggerHeader'
import { Plus, Dumbbell } from 'lucide-react'
import { AddExerciseModal } from '@/components/workout/AddExerciseModal'
import { SuggestNextChip } from '@/components/workout/SuggestNextChip'
import { useExerciseStore } from '@/store/exercise.store'
import { finishWorkoutAction, getUserExerciseFrequency, getUserLatestBodyweight } from './actions'
import { updateRoutineExercisesAction } from '@/app/(app)/routines/actions'
import { useRouter } from 'next/navigation'
import { useDialog } from '@/providers/DialogProvider'
import { Button } from '@/components/ui'
import { FALLBACK_BODYWEIGHT_KG } from '@/lib/load'
import { useTrainingCycle } from '@/hooks/useTrainingCycle'
import { WorkoutFocusSheet } from '@/components/workout/WorkoutFocusSheet'
import { SupersetWrapper } from '@/components/workout/SupersetWrapper'
import { buildWorkoutTemplate } from '@/lib/template-generator'
import { FailureTrainingTip } from '@/components/workout/FailureTrainingTip'
import { canGoBack } from '@/components/ui/BackButton'
import { firstOpenExerciseId, restLabelAfter, workoutProgress } from '@/lib/workout-session'
import { weekLabel } from '@/lib/home'
import type { Exercise, ActiveExercise } from '@/types/database'

// ── Superset grouping ─────────────────────────────────────────────────────────

interface RenderOptions {
  openExerciseId: string | null
  onExpand: (clientId: string) => void
  onReplaceExercise: (i: number) => void
  onOpenPlateCalc: (weight: number) => void
  onRestTimerStart: (seconds: number, exerciseIndex: number) => void
  onPairAsSuperset: (a: number, b: number) => void
  onUnpairSuperset: (i: number) => void
}

function renderExercises(exercises: ActiveExercise[], opts: RenderOptions) {
  const nodes: React.ReactNode[] = []
  const seen = new Set<number>()

  // Pre-collect all group members so non-adjacent pairs don't produce duplicate keys
  const groupMembers = new Map<string, number[]>()
  exercises.forEach((ex, idx) => {
    if (ex.superset_group) {
      const arr = groupMembers.get(ex.superset_group) ?? []
      arr.push(idx)
      groupMembers.set(ex.superset_group, arr)
    }
  })

  const standaloneCandidates = exercises
    .map((ex, idx) => ({ index: idx, name: ex.exercise.name }))
    .filter((_, idx) => !exercises[idx].superset_group)

  for (let i = 0; i < exercises.length; i++) {
    if (seen.has(i)) continue

    const ex = exercises[i]
    const groupId = ex.superset_group

    if (!groupId) {
      const candidates = standaloneCandidates.filter(c => c.index !== i)
      nodes.push(
        <SetLogger
          key={ex.clientId}
          exerciseIndex={i}
          exercise={ex}
          onReplaceExercise={() => opts.onReplaceExercise(i)}
          onOpenPlateCalc={opts.onOpenPlateCalc}
          onRestTimerStart={opts.onRestTimerStart}
          isCollapsed={opts.openExerciseId !== ex.clientId}
          onExpand={() => opts.onExpand(ex.clientId)}
          onSupersetWith={candidates.length > 0 ? (otherIdx) => opts.onPairAsSuperset(i, otherIdx) : undefined}
          supersetCandidates={candidates}
        />
      )
    } else {
      const indices = groupMembers.get(groupId) ?? [i]
      indices.forEach(idx => seen.add(idx))
      const group = indices.map(idx => ({ ex: exercises[idx], idx }))
      const exerciseNames = group.map(g => g.ex.exercise.name)

      nodes.push(
        <SupersetWrapper key={groupId} exerciseNames={exerciseNames}>
          {group.map(({ ex: gex, idx }, pos) => (
            <SetLogger
              key={gex.clientId}
              exerciseIndex={idx}
              exercise={gex}
              onReplaceExercise={() => opts.onReplaceExercise(idx)}
              onOpenPlateCalc={opts.onOpenPlateCalc}
              onRestTimerStart={pos === group.length - 1 ? opts.onRestTimerStart : () => {}}
              isCollapsed={opts.openExerciseId !== gex.clientId}
              onExpand={() => opts.onExpand(gex.clientId)}
              onUnpairSuperset={() => opts.onUnpairSuperset(idx)}
            />
          ))}
        </SupersetWrapper>
      )
    }
  }

  return nodes
}

const LOGGER_SCROLL_KEY = 'logger-scroll'

export default function WorkoutPage() {
  const router = useRouter()
  const { activeWorkout, startWorkout, startFromTemplate, finishWorkout, discardWorkout, addExercise, updateTitle, completeAllSets, pairAsSuperset, unpairSuperset } = useWorkoutStore()
  const dialog = useDialog()
  const { cycle } = useTrainingCycle()

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

  // Plate calculator + rest timer state live here so they render outside
  // backdrop-filter cards (which break fixed positioning on WebKit).
  const [plateCalc, setPlateCalc] = useState<{ isOpen: boolean; weight: number }>({ isOpen: false, weight: 100 })
  const handleOpenPlateCalc = useCallback((weight: number) => setPlateCalc({ isOpen: true, weight }), [])

  // Rest lives in the saved workout as an end time, so it survives leaving
  // the logger and the phone going to sleep.
  const startRest = useWorkoutStore(state => state.startRest)
  const extendRest = useWorkoutStore(state => state.extendRest)
  const clearRest = useWorkoutStore(state => state.clearRest)
  const setOpenExercise = useWorkoutStore(state => state.setOpenExercise)
  const handleRestTimerStart = useCallback((seconds: number, exerciseIndex: number) => {
    const exercises = useWorkoutStore.getState().activeWorkout?.exercises ?? []
    startRest(seconds, restLabelAfter(exercises, exerciseIndex))
  }, [startRest])

  const minimize = useCallback(() => {
    if (canGoBack(window.history.length)) router.back()
    else router.push('/dashboard')
  }, [router])

  // Coming back from the workout bar lands where the lifter left off.
  useEffect(() => {
    const saved = Number(sessionStorage.getItem(LOGGER_SCROLL_KEY))
    if (saved > 0) window.scrollTo(0, saved)
    return () => sessionStorage.setItem(LOGGER_SCROLL_KEY, String(window.scrollY))
  }, [])

  // Focus sheet — shown on the "no active workout" landing screen
  const [focusSheetOpen, setFocusSheetOpen] = useState(false)

  const handleFocusPick = useCallback((exercises: Exercise[]) => {
    setFocusSheetOpen(false)
    if (exercises.length === 0) {
      startWorkout()
    } else {
      startFromTemplate(buildWorkoutTemplate(exercises, null, cycle?.scheme ?? null))
    }
  }, [startWorkout, startFromTemplate, cycle])

  // Exercise cache + usage frequency for "suggest next" chips and focus sheet
  const loadExerciseCache = useExerciseStore(s => s.load)
  const [usageFrequency, setUsageFrequency] = useState<Record<string, number>>({})

  useEffect(() => {
    loadExerciseCache()
    getUserExerciseFrequency().then(setUsageFrequency)
    getUserLatestBodyweight().then(weight => {
      useWorkoutStore.getState().setUserBodyweight(weight ?? 75)
      useWorkoutStore.getState().setBodyweightLogged(weight != null)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkout?.started_at])


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

      // Attach the bodyweight weighted/assisted sets were entered against, so
      // history doesn't shift when bodyweight changes later.
      const bodyweightKg = useWorkoutStore.getState().userBodyweight ?? FALLBACK_BODYWEIGHT_KG
      const result = await finishWorkoutAction({ ...finalWorkout, bodyweight_kg: bodyweightKg })
      if (result.success) {
        finishWorkout()
        router.push('/dashboard')
      } else {
        dialog.alert({ title: 'Error', description: 'Failed to save workout: ' + result.error })
      }
    } catch {
      dialog.alert({ title: 'Error', description: 'An unexpected error occurred.' })
    } finally {
      setIsFinishing(false)
    }
  }

  const dupScheme = cycle?.scheme ?? null

  if (!activeWorkout) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] p-6 text-center">
          <div
            className="w-20 h-20 rounded-card flex items-center justify-center mb-6 bg-surface-raised border border-border"
          >
            <Dumbbell className="w-8 h-8 text-secondary" />
          </div>
          <h1 className="t-display-m mb-2">Ready to lift?</h1>
          <p className="t-body mb-8 max-w-xs">
            Pick a focus to get starter exercises, or jump straight in blank.
          </p>
          <Button onClick={() => setFocusSheetOpen(true)} fullWidth={false} className="px-8">
            Pick a focus
          </Button>

        </div>

        <WorkoutFocusSheet
          isOpen={focusSheetOpen}
          onClose={() => setFocusSheetOpen(false)}
          usageFrequency={usageFrequency}
          onPick={handleFocusPick}
        />
      </>
    )
  }

  return (
    <div className="pb-32 min-h-screen">

      <LoggerHeader
        title={activeWorkout.title}
        onTitleChange={updateTitle}
        startedAt={activeWorkout.started_at}
        progress={workoutProgress(activeWorkout)}
        weekChip={dupScheme ? `${weekLabel(dupScheme, false)} · ${dupScheme.repRange.min}–${dupScheme.repRange.max} reps · RPE ${dupScheme.rpeTarget}` : null}
        onMinimize={minimize}
        onFinish={handleFinish}
        isFinishing={isFinishing}
      />

      <div className="p-4 space-y-2">

        {/* ── Failure training guidance ─────────────────────────────────── */}
        <FailureTrainingTip exercises={activeWorkout.exercises} />

        {/* ── Empty exercise state ──────────────────────────────────────── */}
        {activeWorkout.exercises.length === 0 ? (
          <div className="glass border-dashed text-center py-16 mt-4">
            <div
              className="w-14 h-14 rounded-control flex items-center justify-center mx-auto mb-4 bg-surface-raised border border-border"
            >
              <Plus className="w-7 h-7 text-secondary" />
            </div>
            <p className="text-sm font-medium text-primary mb-1">Workout is empty</p>
            <p className="t-caption">Add an exercise to start tracking.</p>
          </div>
        ) : (
          renderExercises(activeWorkout.exercises, {
            openExerciseId: activeWorkout.openExerciseId ?? firstOpenExerciseId(activeWorkout.exercises),
            onExpand: setOpenExercise,
            onReplaceExercise: (i) => setAddingExerciseMode({ mode: 'replace', index: i }),
            onOpenPlateCalc: handleOpenPlateCalc,
            onRestTimerStart: handleRestTimerStart,
            onPairAsSuperset: pairAsSuperset,
            onUnpairSuperset: (i) => unpairSuperset(i),
          })
        )}

        {/* ── Suggest-next chips — blank workouts only ──────────────────── */}
        {!activeWorkout.routine_id && activeWorkout.exercises.length > 0 && (
          <SuggestNextChip
            workoutExercises={activeWorkout.exercises}
            usageFrequency={usageFrequency}
            onAdd={ex => addExercise(ex)}
          />
        )}

        {/* ── Add exercise ──────────────────────────────────────────────── */}
        <button
          onClick={() => setAddingExerciseMode({ mode: 'add' })}
          className="w-full min-h-12 mt-4 rounded-pill flex items-center justify-center gap-2 text-sm font-medium border border-dashed border-border-strong text-primary bg-surface-raised transition-colors"
        >
          <Plus className="w-4 h-4" /> Add exercise
        </button>

        {/* ── Discard ───────────────────────────────────────────────────── */}
        <button
          onClick={handleDiscard}
          className="w-full min-h-11 mt-4 text-sm font-medium text-negative rounded-pill transition-colors"
        >
          Discard workout
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
        PlateCalculator and RestBar live here — NOT inside SetLogger cards.
        backdrop-filter creates a new CSS containing block which breaks
        fixed-position children. Rendering here ensures viewport-level positioning.
      */}
      <PlateCalculator
        isOpen={plateCalc.isOpen}
        onClose={() => setPlateCalc(p => ({ ...p, isOpen: false }))}
        initialWeight={plateCalc.weight}
      />

      <RestBar rest={activeWorkout.rest} onExtend={extendRest} onSkip={clearRest} />
    </div>
  )
}

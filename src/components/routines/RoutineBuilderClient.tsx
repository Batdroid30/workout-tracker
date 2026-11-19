'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui/Input'
import { AddExerciseModal } from '@/components/workout/AddExerciseModal'
import { createRoutineAction, updateRoutineDetailsAction } from '@/app/(app)/routines/actions'
import type { Exercise } from '@/types/database'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { useDialog } from '@/providers/DialogProvider'

interface RoutineExerciseBuilder {
  exercise: Exercise
  target_sets: number
  target_reps: number
  progression_model: 'double' | 'rep_sum'
  rep_sum_target: number
}

interface RoutineBuilderProps {
  userId: string
  initialRoutine?: {
    id: string
    title: string
    notes: string | null
    routine_exercises: any[]
  }
}

export function RoutineBuilderClient({ userId, initialRoutine }: RoutineBuilderProps) {
  const router = useRouter()
  const dialog = useDialog()

  const [title,  setTitle]  = useState(initialRoutine?.title  || 'New routine')
  const [notes,  setNotes]  = useState(initialRoutine?.notes  || '')

  const [exercises, setExercises] = useState<RoutineExerciseBuilder[]>(
    initialRoutine?.routine_exercises.map(re => ({
      exercise:          re.exercise,
      target_sets:       re.target_sets,
      target_reps:       re.target_reps,
      progression_model: (re.progression_model as 'double' | 'rep_sum') ?? 'double',
      rep_sum_target:    re.rep_sum_target ?? re.target_sets * re.target_reps,
    })) || [],
  )

  const [isAddingExercise, setIsAddingExercise] = useState(false)
  const [isSaving,         setIsSaving]         = useState(false)

  // Adds one or more exercises at once (multi-select from modal)
  const handleAddExercises = (selected: Exercise[]) => {
    const newEntries = selected.map(ex => ({ exercise: ex, target_sets: 3, target_reps: 10, progression_model: 'double' as const, rep_sum_target: 30 }))
    setExercises(prev => [...prev, ...newEntries])
  }

  const handleUpdateExercise = (index: number, updates: Partial<RoutineExerciseBuilder>) => {
    setExercises(prev => {
      const next = [...prev]
      next[index] = { ...next[index], ...updates }
      return next
    })
  }

  const handleRemoveExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (exercises.length === 0) {
      dialog.alert({ title: 'Missing exercises', description: 'Please add at least one exercise to your routine.' })
      return
    }

    try {
      setIsSaving(true)
      const payload = {
        title,
        notes,
        exercises: exercises.map(ex => ({
          exercise_id:       ex.exercise.id,
          target_sets:       ex.target_sets,
          target_reps:       ex.target_reps,
          progression_model: ex.progression_model,
          rep_sum_target:    ex.progression_model === 'rep_sum' ? ex.rep_sum_target : null,
        })),
      }

      if (initialRoutine) {
        await updateRoutineDetailsAction(initialRoutine.id, payload)
      } else {
        await createRoutineAction(payload)
      }

      router.push('/routines')
    } catch (err) {
      console.error(err)
      dialog.alert({ title: 'Error', description: 'Failed to save routine. Please try again.' })
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-md mx-auto w-full pb-32 min-h-screen">

      {/* ── Top Nav ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3 bg-bg border-b border-border">
        {/* Back */}
        <Link
          href="/routines"
          className="p-2.5 rounded-control transition-colors text-secondary hover:bg-surface-raised shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Title — takes remaining space, truncates on narrow screens */}
        <h1 className="flex-1 min-w-0 text-sm font-semibold text-primary truncate">
          {initialRoutine ? 'Edit routine' : 'Build routine'}
        </h1>

        {/* Save — fixed width, not full-width */}
        <Button
          onClick={handleSave}
          loading={isSaving}
          disabled={exercises.length === 0}
          size="sm"
          fullWidth={false}
          className="shrink-0"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      <div className="p-4 space-y-5">

        {/* ── Basic Info ──────────────────────────────────────────────────── */}
        <div className="card p-4 space-y-4">
          <div>
            <label className="t-label block mb-2">
              Routine title
            </label>
            <Input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Push Day, Upper Body"
              className="font-semibold tracking-tight"
            />
          </div>

          <div>
            <label className="t-label block mb-2">
              Notes{' '}
              <span className="font-normal text-tertiary">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-control px-4 py-3 text-sm text-primary bg-surface-raised border border-border-strong placeholder:text-tertiary focus:border-accent focus:outline-none resize-none h-20 transition-colors"
              placeholder="e.g. Focus on slow eccentrics…"
            />
          </div>
        </div>

        {/* ── Exercises List ───────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="t-label">Exercises</h3>

          {exercises.map((ex, i) => (
            <div
              key={i}
              className="card overflow-hidden"
            >
              <div className="px-4 py-3 flex justify-between items-center bg-surface-raised border-b border-border">
                <div className="min-w-0">
                  <h4 className="font-semibold tracking-tight text-sm text-primary truncate">
                    {ex.exercise.name}
                  </h4>
                  <p className="t-label mt-0.5 capitalize">{ex.exercise.muscle_group}</p>
                </div>
                <button
                  onClick={() => handleRemoveExercise(i)}
                  className="p-2.5 rounded-control transition-colors text-tertiary hover:bg-negative-soft hover:text-negative"
                  aria-label={`Remove ${ex.exercise.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* Progression model toggle */}
                <div>
                  <label className="block text-xs font-medium mb-2 text-tertiary">
                    Progression
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['double', 'rep_sum'] as const).map(model => (
                      <button
                        key={model}
                        type="button"
                        onClick={() => handleUpdateExercise(i, { progression_model: model })}
                        className={`h-10 rounded-pill text-xs font-medium transition-colors ${
                          ex.progression_model === model
                            ? 'bg-primary text-bg'
                            : 'bg-surface-raised text-secondary border border-border'
                        }`}
                      >
                        {model === 'double' ? 'Double' : 'Rep bank'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sets + Reps / Rep bank target */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="min-w-0">
                    <label className="block text-xs font-medium mb-2 text-center text-tertiary">
                      Sets
                    </label>
                    <NumberStepper
                      value={ex.target_sets}
                      onChange={val => handleUpdateExercise(i, { target_sets: val })}
                      min={1}
                      max={10}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-xs font-medium mb-2 text-center text-tertiary">
                      {ex.progression_model === 'rep_sum' ? 'Total reps' : 'Reps'}
                    </label>
                    {ex.progression_model === 'rep_sum' ? (
                      <NumberStepper
                        value={ex.rep_sum_target}
                        onChange={val => handleUpdateExercise(i, { rep_sum_target: val })}
                        min={5}
                        max={200}
                        step={5}
                      />
                    ) : (
                      <NumberStepper
                        value={ex.target_reps}
                        onChange={val => handleUpdateExercise(i, { target_reps: val })}
                        min={1}
                        max={50}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => setIsAddingExercise(true)}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-pill border border-dashed border-border-strong text-sm font-medium text-primary transition-colors hover:bg-surface-raised"
          >
            <Plus className="w-4 h-4" /> Add exercise
          </button>
        </div>
      </div>

      <AddExerciseModal
        isOpen={isAddingExercise}
        onClose={() => setIsAddingExercise(false)}
        onConfirm={handleAddExercises}
      />
    </div>
  )
}

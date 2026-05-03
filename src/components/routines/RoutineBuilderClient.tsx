'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
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

  const [title,  setTitle]  = useState(initialRoutine?.title  || 'New Routine')
  const [notes,  setNotes]  = useState(initialRoutine?.notes  || '')

  const [exercises, setExercises] = useState<RoutineExerciseBuilder[]>(
    initialRoutine?.routine_exercises.map(re => ({
      exercise:    re.exercise,
      target_sets: re.target_sets,
      target_reps: re.target_reps,
    })) || [],
  )

  const [isAddingExercise, setIsAddingExercise] = useState(false)
  const [isSaving,         setIsSaving]         = useState(false)

  // Adds one or more exercises at once (multi-select from modal)
  const handleAddExercises = (selected: Exercise[]) => {
    const newEntries = selected.map(ex => ({ exercise: ex, target_sets: 3, target_reps: 10 }))
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
      dialog.alert({ title: 'Missing Exercises', description: 'Please add at least one exercise to your routine.' })
      return
    }

    try {
      setIsSaving(true)
      const payload = {
        title,
        notes,
        exercises: exercises.map(ex => ({
          exercise_id: ex.exercise.id,
          target_sets: ex.target_sets,
          target_reps: ex.target_reps,
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
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{
          background: 'rgba(6,7,13,0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid var(--glass-border)',
        }}
      >
        {/* Back */}
        <Link
          href="/routines"
          className="p-2.5 rounded-[var(--radius-inner)] transition-colors hover:bg-white/[0.06] shrink-0"
          style={{ color: 'var(--text-mid)' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Title — takes remaining space, truncates on narrow screens */}
        <h1
          className="flex-1 min-w-0 text-sm font-semibold uppercase tracking-widest truncate"
          style={{ color: 'var(--text-hi)' }}
        >
          {initialRoutine ? 'Edit Routine' : 'Build Routine'}
        </h1>

        {/* Save — fixed width, not full-width */}
        <Button
          onClick={handleSave}
          disabled={isSaving || exercises.length === 0}
          className="w-auto shrink-0 h-10 px-6 text-xs"
        >
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </div>

      <div className="p-4 space-y-5">

        {/* ── Basic Info ──────────────────────────────────────────────────── */}
        <div className="glass p-4 space-y-4">
          <div>
            <label className="t-label block mb-2">
              Routine Title
            </label>
            <Input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Push Day, Upper Body"
              className="uppercase font-semibold tracking-tight"
            />
          </div>

          <div>
            <label className="t-label block mb-2">
              Notes{' '}
              <span className="normal-case font-normal tracking-normal" style={{ color: 'var(--text-faint)' }}>(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full rounded-[var(--radius-inner)] px-4 py-3 text-sm focus:outline-none resize-none h-20 transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--glass-border)',
                color: 'var(--text-hi)',
              }}
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
              className="glass overflow-hidden"
            >
              <div
                className="px-4 py-3 flex justify-between items-center"
                style={{
                  background: 'var(--bg-1)',
                  borderBottom: '1px solid var(--glass-border)',
                }}
              >
                <div>
                  <h4
                    className="font-semibold uppercase tracking-tight text-sm"
                    style={{ color: 'var(--accent)' }}
                  >
                    {ex.exercise.name}
                  </h4>
                  <p className="t-label mt-0.5 capitalize">{ex.exercise.muscle_group}</p>
                </div>
                <button
                  onClick={() => handleRemoveExercise(i)}
                  className="p-2.5 rounded-[var(--radius-inner)] transition-colors hover:bg-red-500/10 hover:text-red-400"
                  style={{ color: 'var(--text-faint)' }}
                  aria-label={`Remove ${ex.exercise.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label
                    className="block text-[9px] font-medium uppercase tracking-widest mb-2 text-center"
                    style={{ color: 'var(--text-faint)' }}
                  >
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
                  <label
                    className="block text-[9px] font-medium uppercase tracking-widest mb-2 text-center"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    Reps
                  </label>
                  <NumberStepper
                    value={ex.target_reps}
                    onChange={val => handleUpdateExercise(i, { target_reps: val })}
                    min={1}
                    max={50}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => setIsAddingExercise(true)}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-[var(--radius-inner)] text-xs font-medium uppercase tracking-widest transition-colors hover:bg-white/[0.04]"
            style={{
              border: '1px dashed var(--glass-border)',
              color: 'var(--accent)',
            }}
          >
            <Plus className="w-4 h-4" /> Add Exercise
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

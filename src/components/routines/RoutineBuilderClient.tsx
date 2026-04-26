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
    <div className="max-w-md mx-auto w-full pb-32 bg-[#070d1f] min-h-screen">

      {/* ── Top Nav ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-[#070d1f]/95 backdrop-blur border-b border-[#334155] px-4 py-3 flex items-center gap-3">
        {/* Back */}
        <Link href="/routines" className="p-2.5 hover:bg-[#151b2d] rounded-lg transition-colors shrink-0">
          <ArrowLeft className="w-5 h-5 text-[#adb4ce]" />
        </Link>

        {/* Title — takes remaining space, truncates on narrow screens */}
        <h1 className="flex-1 min-w-0 text-sm font-black uppercase tracking-widest text-white truncate">
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
        <div className="glass-panel border border-[#334155] rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-[10px] font-black text-[#adb4ce] uppercase tracking-[0.15em] mb-2">
              Routine Title
            </label>
            <Input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Push Day, Upper Body"
              className="uppercase font-black tracking-tight"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-[#adb4ce] uppercase tracking-[0.15em] mb-2">
              Notes{' '}
              <span className="text-[#4a5568] normal-case font-body tracking-normal">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-[#070d1f] border border-[#334155] rounded-xl px-4 py-3 text-[#dce1fb] text-sm font-body focus:outline-none focus:border-[#CCFF00]/50 resize-none h-20 transition-colors placeholder:text-[#334155]"
              placeholder="e.g. Focus on slow eccentrics…"
            />
          </div>
        </div>

        {/* ── Exercises List ───────────────────────────────────────────────── */}
        <div className="space-y-3">
          <h3 className="text-xs font-black text-[#adb4ce] uppercase tracking-[0.15em]">Exercises</h3>

          {exercises.map((ex, i) => (
            <div key={i} className="glass-panel border border-[#334155] rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-[#0c1324] border-b border-[#334155] flex justify-between items-center">
                <div>
                  <h4 className="font-black text-[#CCFF00] uppercase tracking-tight text-sm">{ex.exercise.name}</h4>
                  <p className="text-[10px] text-[#4a5568] uppercase tracking-[0.15em] mt-0.5">{ex.exercise.muscle_group}</p>
                </div>
                <button
                  onClick={() => handleRemoveExercise(i)}
                  className="p-2.5 text-[#4a5568] hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  aria-label={`Remove ${ex.exercise.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 grid grid-cols-2 gap-3">
                <div className="min-w-0">
                  <label className="block text-[9px] font-black text-[#4a5568] uppercase tracking-widest mb-2 text-center">
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
                  <label className="block text-[9px] font-black text-[#4a5568] uppercase tracking-widest mb-2 text-center">
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
            className="w-full h-12 flex items-center justify-center gap-2 border border-dashed border-[#334155] rounded-xl text-[#CCFF00] font-black hover:bg-[#151b2d] transition-colors text-xs uppercase tracking-widest"
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

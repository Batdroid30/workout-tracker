'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ArrowLeft, Save, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { AddExerciseModal } from '@/components/workout/AddExerciseModal'
import { createRoutineAction } from '../actions'
import type { Exercise } from '@/types/database'
import { NumberStepper } from '@/components/ui/NumberStepper'
import { useDialog } from '@/providers/DialogProvider'

interface RoutineExerciseBuilder {
  exercise: Exercise
  target_sets: number
  target_reps: number
}

export function CreateRoutineClient({ userId }: { userId: string }) {
  const router = useRouter()
  const [title, setTitle] = useState('New Routine')
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState<RoutineExerciseBuilder[]>([])
  const dialog = useDialog()
  
  const [isAddingExercise, setIsAddingExercise] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  const handleAddExercise = (exercise: Exercise) => {
    setExercises([...exercises, { exercise, target_sets: 3, target_reps: 10 }])
    setIsAddingExercise(false)
  }

  const handleUpdateExercise = (index: number, updates: Partial<RoutineExerciseBuilder>) => {
    const newExs = [...exercises]
    newExs[index] = { ...newExs[index], ...updates }
    setExercises(newExs)
  }

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (exercises.length === 0) {
      dialog.alert({ title: 'Missing Exercises', description: 'Please add at least one exercise to your routine.' })
      return
    }

    try {
      setIsSaving(true)
      await createRoutineAction({
        title,
        notes,
        exercises: exercises.map(ex => ({
          exercise_id: ex.exercise.id,
          target_sets: ex.target_sets,
          target_reps: ex.target_reps
        }))
      })
      router.push('/routines')
    } catch (err) {
      console.error(err)
      dialog.alert({ title: 'Error', description: 'Failed to save routine. Please try again.' })
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-md mx-auto w-full pb-32">
      {/* Top Nav */}
      <div className="sticky top-0 z-30 bg-black/90 backdrop-blur border-b border-zinc-900 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/routines" className="p-2 -ml-2 rounded-full hover:bg-zinc-900 transition-colors">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <h1 className="text-xl font-bold font-sans">Build Routine</h1>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving || exercises.length === 0}
          className="h-9 px-4 text-sm"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="p-4 space-y-6">
        {/* Basic Info */}
        <div className="space-y-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Routine Title</label>
            <input 
              type="text" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-brand"
              placeholder="e.g. Push Day, Upper Body"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Notes (Optional)</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-brand resize-none h-20"
              placeholder="e.g. Focus on slow eccentrics..."
            />
          </div>
        </div>

        {/* Exercises List */}
        <div className="space-y-4">
          <h3 className="font-bold text-white text-lg">Exercises</h3>
          
          {exercises.map((ex, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-4 bg-zinc-900/80 border-b border-zinc-800 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-brand">{ex.exercise.name}</h4>
                  <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">{ex.exercise.muscle_group}</p>
                </div>
                <button 
                  onClick={() => handleRemoveExercise(i)}
                  className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 text-center">Target Sets</label>
                  <NumberStepper 
                    value={ex.target_sets} 
                    onChange={val => handleUpdateExercise(i, { target_sets: val })} 
                    step={1} 
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 text-center">Target Reps</label>
                  <NumberStepper 
                    value={ex.target_reps} 
                    onChange={val => handleUpdateExercise(i, { target_reps: val })} 
                    step={1} 
                  />
                </div>
              </div>
            </div>
          ))}

          <Button 
            variant="secondary" 
            onClick={() => setIsAddingExercise(true)}
            className="w-full h-14 border-2 border-dashed border-zinc-800 bg-transparent text-brand hover:bg-zinc-900"
          >
            <Plus className="w-5 h-5 mr-2" /> Add Exercise
          </Button>
        </div>
      </div>

      <AddExerciseModal 
        isOpen={isAddingExercise}
        onClose={() => setIsAddingExercise(false)}
        onSelect={handleAddExercise}
      />
    </div>
  )
}

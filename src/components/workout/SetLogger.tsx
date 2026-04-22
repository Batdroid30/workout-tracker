'use client'
import { SetRow } from './SetRow'
import type { ActiveExercise } from '@/types/database'
import { Button } from '@/components/ui/Button'
import { Plus, Check, MoreVertical } from 'lucide-react'
import { useState } from 'react'
import { useWorkoutStore } from '@/store/workout.store'
import { useExerciseHistory } from '@/hooks/useExerciseHistory'
import { useDialog } from '@/providers/DialogProvider'

interface SetLoggerProps {
  exerciseIndex: number
  exercise: ActiveExercise
  onSetCompleted?: () => void
  onReplaceExercise?: () => void
}

export function SetLogger({ exerciseIndex, exercise, onSetCompleted, onReplaceExercise }: SetLoggerProps) {
  const { updateSet, markSetDone, addSet, removeExercise, removeSet, moveExerciseUp, moveExerciseDown } = useWorkoutStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const dialog = useDialog()
  const { history } = useExerciseHistory(exercise.exercise.id)

  return (
    <div className="bg-zinc-900/50 rounded-2xl overflow-hidden mb-6 border border-zinc-800">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80">
        <div>
          <h3 className="font-bold text-lg text-brand font-sans">{exercise.exercise.name}</h3>
          <p className="text-xs text-zinc-500 font-mono uppercase tracking-wider">{exercise.exercise.muscle_group}</p>
        </div>
        <div className="relative">
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-zinc-500 hover:text-white p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-20">
              <button 
                onClick={() => { onReplaceExercise?.(); setMenuOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-colors"
              >
                Replace Exercise
              </button>
              <button 
                onClick={() => { moveExerciseUp(exerciseIndex); setMenuOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-colors"
              >
                Move Up
              </button>
              <button 
                onClick={() => { moveExerciseDown(exerciseIndex); setMenuOpen(false); }}
                className="w-full text-left px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-colors border-b border-zinc-800"
              >
                Move Down
              </button>
              <button 
                onClick={async () => {
                  setMenuOpen(false);
                  const confirmed = await dialog.confirm({
                    title: 'Remove Exercise',
                    description: 'Are you sure you want to remove this exercise from the workout?',
                    danger: true,
                    confirmText: 'Remove'
                  });
                  if (confirmed) removeExercise(exerciseIndex);
                }}
                className="w-full text-left px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 transition-colors"
              >
                Remove Exercise
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table Headers */}
      <div className="flex items-center gap-2 px-4 py-2 mt-2">
        <span className="w-8 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Set</span>
        <span className="w-16 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Prev</span>
        <span className="flex-1 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">kg</span>
        <span className="flex-1 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Reps</span>
        <span className="w-12 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider"><Check className="w-3 h-3 mx-auto"/></span>
      </div>

      {/* Rows */}
      <div className="px-4 pb-4">
        {exercise.sets.map((set, setIndex) => {
          // Find the previous record for this set number in history
          const prevRecord = history[setIndex]
          const prevText = prevRecord 
            ? `${prevRecord.weight_kg} × ${prevRecord.reps}`
            : '-'

          return (
            <SetRow 
              key={set.id}
              set={set}
              prevSetText={prevText}
              onChange={(updates) => updateSet(exerciseIndex, setIndex, updates)}
              onDone={() => {
                markSetDone(exerciseIndex, setIndex)
                onSetCompleted?.()
              }}
              onRemove={() => removeSet(exerciseIndex, setIndex)}
            />
          )
        })}
        
        {/* Add Set Button */}
        <button 
          onClick={() => addSet(exerciseIndex)}
          className="w-full flex items-center justify-center gap-2 h-10 mt-3 text-sm font-bold text-brand bg-brand/10 hover:bg-brand/20 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Set
        </button>
      </div>
    </div>
  )
}

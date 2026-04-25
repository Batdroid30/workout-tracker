'use client'

import { SetRow }               from './SetRow'
import { WarmupRamp }           from './WarmupRamp'
import { PlateCalculator }      from './PlateCalculator'
import type { ActiveExercise }  from '@/types/database'
import { Plus, Check, MoreVertical, Calculator } from 'lucide-react'
import { useState } from 'react'
import { useWorkoutStore }      from '@/store/workout.store'
import { useExerciseHistory }   from '@/hooks/useExerciseHistory'
import { useOverloadSuggestion } from '@/hooks/useOverloadSuggestion'
import { useDialog }            from '@/providers/DialogProvider'

interface SetLoggerProps {
  exerciseIndex: number
  exercise: ActiveExercise
  onSetCompleted?: () => void
  onReplaceExercise?: () => void
}

export function SetLogger({ exerciseIndex, exercise, onSetCompleted, onReplaceExercise }: SetLoggerProps) {
  const { updateSet, markSetDone, addSet, removeExercise, removeSet, moveExerciseUp, moveExerciseDown } = useWorkoutStore()
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [plateCalcOpen, setPlateCalcOpen] = useState(false)
  const dialog  = useDialog()
  const { history }    = useExerciseHistory(exercise.exercise.id)
  const { suggestion, lastWeight, lastReps } = useOverloadSuggestion(exercise.exercise.id)

  // Working weight = first non-warmup set with a weight entered
  const workingWeight = exercise.sets.find(s => !s.is_warmup && s.weight_kg > 0)?.weight_kg ?? 0

  return (
    <div className="glass-panel rounded-xl overflow-hidden mb-4 border border-[#334155]">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#334155] bg-[#0c1324]">
        <div>
          <h3 className="font-black text-base text-[#CCFF00] uppercase tracking-tight">{exercise.exercise.name}</h3>
          <p className="text-[10px] text-[#4a5568] uppercase tracking-[0.15em] mt-0.5">{exercise.exercise.muscle_group}</p>
        </div>
        <div className="flex items-center gap-1">
          {/* Plate calculator trigger */}
          <button
            onClick={() => setPlateCalcOpen(true)}
            className="text-[#4a5568] hover:text-[#adb4ce] p-2 hover:bg-[#151b2d] rounded-lg transition-colors"
            aria-label="Plate calculator"
          >
            <Calculator className="w-4 h-4" />
          </button>

          {/* Exercise menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-[#4a5568] hover:text-[#adb4ce] p-2 hover:bg-[#151b2d] rounded-lg transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#0c1324] border border-[#334155] rounded-xl shadow-xl overflow-hidden z-20">
                <button onClick={() => { onReplaceExercise?.(); setMenuOpen(false) }} className="w-full text-left px-4 py-3 text-sm font-bold text-[#dce1fb] hover:bg-[#151b2d] transition-colors">Replace Exercise</button>
                <button onClick={() => { moveExerciseUp(exerciseIndex); setMenuOpen(false) }} className="w-full text-left px-4 py-3 text-sm font-bold text-[#dce1fb] hover:bg-[#151b2d] transition-colors">Move Up</button>
                <button onClick={() => { moveExerciseDown(exerciseIndex); setMenuOpen(false) }} className="w-full text-left px-4 py-3 text-sm font-bold text-[#dce1fb] hover:bg-[#151b2d] transition-colors border-b border-[#334155]">Move Down</button>
                <button
                  onClick={async () => {
                    setMenuOpen(false)
                    const confirmed = await dialog.confirm({ title: 'Remove Exercise', description: 'Remove this exercise from the workout?', danger: true, confirmText: 'Remove' })
                    if (confirmed) removeExercise(exerciseIndex)
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Remove Exercise
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Coach suggestion — shown when last session data exists */}
      {suggestion && lastWeight !== null && lastReps !== null && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#1e293b] bg-[#CCFF00]/5">
          <span className="text-[9px] font-black text-[#CCFF00] uppercase tracking-widest">Coach</span>
          <span className="text-[10px] text-[#4a5568] font-body">
            Last: {lastWeight}kg × {lastReps}
          </span>
          <span className="text-sm font-black text-[#CCFF00] tracking-tight">
            → {suggestion.weight_kg}×{suggestion.target_reps}
          </span>
        </div>
      )}

      {/* Warmup ramp — shown when working weight is entered */}
      <WarmupRamp workingWeight={workingWeight} />

      {/* Column Headers */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1e293b]">
        <span className="w-8 text-center text-[9px] font-black text-[#334155] uppercase tracking-widest">Set</span>
        <span className="w-16 text-center text-[9px] font-black text-[#334155] uppercase tracking-widest">Prev</span>
        <span className="flex-1 text-center text-[9px] font-black text-[#334155] uppercase tracking-widest">kg</span>
        <span className="flex-1 text-center text-[9px] font-black text-[#334155] uppercase tracking-widest">Reps</span>
        <span className="w-12 text-center text-[9px] font-black text-[#334155] uppercase tracking-widest"><Check className="w-3 h-3 mx-auto" /></span>
      </div>

      {/* Rows */}
      <div className="px-4 py-3">
        {exercise.sets.map((set, setIndex) => {
          const prevRecord = history[setIndex]
          const prevText   = prevRecord ? `${prevRecord.weight_kg}×${prevRecord.reps}` : '-'

          return (
            <SetRow
              key={set.id}
              set={set}
              prevSetText={prevText}
              onChange={(updates) => updateSet(exerciseIndex, setIndex, updates)}
              onDone={() => { markSetDone(exerciseIndex, setIndex); onSetCompleted?.() }}
              onRemove={() => removeSet(exerciseIndex, setIndex)}
            />
          )
        })}

        <button
          onClick={() => addSet(exerciseIndex)}
          className="w-full flex items-center justify-center gap-2 h-9 mt-2 text-[11px] font-black text-[#CCFF00] bg-[#CCFF00]/5 hover:bg-[#CCFF00]/10 rounded-lg transition-colors border border-[#CCFF00]/10 hover:border-[#CCFF00]/20 uppercase tracking-widest"
        >
          <Plus className="w-3.5 h-3.5" /> Add Set
        </button>
      </div>

      {/* Plate calculator modal */}
      <PlateCalculator
        isOpen={plateCalcOpen}
        onClose={() => setPlateCalcOpen(false)}
        initialWeight={workingWeight || 100}
      />
    </div>
  )
}

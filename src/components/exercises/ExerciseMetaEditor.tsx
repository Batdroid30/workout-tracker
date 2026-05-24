'use client'

import { useState, useTransition } from 'react'
import { Pencil } from 'lucide-react'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useToast } from '@/providers/ToastProvider'
import { updateExerciseAction } from '@/app/(app)/exercises/actions'
import type { MuscleGroup, MovementPattern } from '@/types/database'

// ── Data ─────────────────────────────────────────────────────────────────────

const MUSCLE_GROUPS: { value: MuscleGroup; label: string }[] = [
  { value: 'chest',      label: 'Chest'      },
  { value: 'back',       label: 'Back'       },
  { value: 'lats',       label: 'Lats'       },
  { value: 'shoulders',  label: 'Shoulders'  },
  { value: 'traps',      label: 'Traps'      },
  { value: 'biceps',     label: 'Biceps'     },
  { value: 'triceps',    label: 'Triceps'    },
  { value: 'forearms',   label: 'Forearms'   },
  { value: 'quads',      label: 'Quads'      },
  { value: 'hamstrings', label: 'Hamstrings' },
  { value: 'glutes',     label: 'Glutes'     },
  { value: 'calves',     label: 'Calves'     },
  { value: 'core',       label: 'Core'       },
]

const MOVEMENT_PATTERNS: { value: MovementPattern; label: string }[] = [
  { value: 'push',      label: 'Push'      },
  { value: 'pull',      label: 'Pull'      },
  { value: 'hinge',     label: 'Hinge'     },
  { value: 'squat',     label: 'Squat'     },
  { value: 'carry',     label: 'Carry'     },
  { value: 'isolation', label: 'Isolation' },
]

// ── Props ─────────────────────────────────────────────────────────────────────

interface ExerciseMetaEditorProps {
  exerciseId:              string
  currentMuscleGroup:      MuscleGroup
  currentMovementPattern:  MovementPattern
  currentSecondaryMuscles: MuscleGroup[]
}

function arraysEqual(a: MuscleGroup[], b: MuscleGroup[]) {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((v, i) => v === sb[i])
}

export function ExerciseMetaEditor({
  exerciseId,
  currentMuscleGroup,
  currentMovementPattern,
  currentSecondaryMuscles,
}: ExerciseMetaEditorProps) {
  const [isOpen,           setIsOpen]           = useState(false)
  const [muscleGroup,      setMuscleGroup]      = useState<MuscleGroup>(currentMuscleGroup)
  const [movementPattern,  setMovementPattern]  = useState<MovementPattern>(currentMovementPattern)
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>(currentSecondaryMuscles)
  const [isPending,        startTransition]     = useTransition()
  const toast = useToast()

  function handleOpen() {
    setMuscleGroup(currentMuscleGroup)
    setMovementPattern(currentMovementPattern)
    setSecondaryMuscles(currentSecondaryMuscles)
    setIsOpen(true)
  }

  function toggleSecondary(mg: MuscleGroup) {
    setSecondaryMuscles(prev =>
      prev.includes(mg) ? prev.filter(m => m !== mg) : [...prev, mg]
    )
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateExerciseAction(exerciseId, {
        muscle_group:      muscleGroup,
        movement_pattern:  movementPattern,
        secondary_muscles: secondaryMuscles.length > 0 ? secondaryMuscles : null,
      })

      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Exercise updated')
        setIsOpen(false)
      }
    })
  }

  const isDirty =
    muscleGroup !== currentMuscleGroup ||
    movementPattern !== currentMovementPattern ||
    !arraysEqual(secondaryMuscles, currentSecondaryMuscles)

  return (
    <>
      <button
        onClick={handleOpen}
        className="p-1.5 rounded-lg transition-colors hover:bg-white/[0.06] hover:opacity-80"
        style={{ color: 'var(--text-faint)' }}
        aria-label="Edit muscle group and movement pattern"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      <BottomSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Edit Exercise"
        icon={<Pencil className="w-4 h-4" style={{ color: 'var(--accent)' }} />}
        position="center"
      >
        {/* Primary muscle group */}
        <div className="mb-6">
          <p className="t-label mb-3">Primary Muscle</p>
          <div className="grid grid-cols-3 gap-2">
            {MUSCLE_GROUPS.map(({ value, label }) => {
              const isSelected = muscleGroup === value
              return (
                <button
                  key={value}
                  onClick={() => {
                    setMuscleGroup(value)
                    setSecondaryMuscles(prev => prev.filter(m => m !== value))
                  }}
                  className="py-2.5 px-2 rounded-[var(--radius-inner)] text-xs font-medium uppercase tracking-wider transition-all active:scale-95"
                  style={isSelected
                    ? { background: 'var(--accent)', color: 'var(--accent-on)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-mid)', border: '1px solid var(--glass-border)' }
                  }
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Secondary muscles */}
        <div className="mb-6">
          <p className="t-label mb-1">Secondary Muscles</p>
          <p className="text-xs mb-3" style={{ color: 'var(--text-faint)' }}>
            Select all muscles this exercise works
          </p>
          <div className="grid grid-cols-3 gap-2">
            {MUSCLE_GROUPS
              .filter(({ value }) => value !== muscleGroup)
              .map(({ value, label }) => {
                const isSelected = secondaryMuscles.includes(value)
                return (
                  <button
                    key={value}
                    onClick={() => toggleSecondary(value)}
                    className="py-2.5 px-2 rounded-[var(--radius-inner)] text-xs font-medium uppercase tracking-wider transition-all active:scale-95"
                    style={isSelected
                      ? { background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }
                      : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-mid)', border: '1px solid var(--glass-border)' }
                    }
                  >
                    {label}
                  </button>
                )
              })}
          </div>
        </div>

        {/* Movement pattern */}
        <div className="mb-8">
          <p className="t-label mb-3">Movement Pattern</p>
          <div className="grid grid-cols-3 gap-2">
            {MOVEMENT_PATTERNS.map(({ value, label }) => {
              const isSelected = movementPattern === value
              return (
                <button
                  key={value}
                  onClick={() => setMovementPattern(value)}
                  className="py-2.5 px-2 rounded-[var(--radius-inner)] text-xs font-medium uppercase tracking-wider transition-all active:scale-95"
                  style={isSelected
                    ? { background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-mid)', border: '1px solid var(--glass-border)' }
                  }
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!isDirty || isPending}
          className="w-full py-3.5 rounded-[var(--radius-pill)] font-semibold uppercase tracking-widest text-sm transition-all active:scale-95 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}
        >
          {isPending ? 'Saving…' : 'Save Changes'}
        </button>
      </BottomSheet>
    </>
  )
}

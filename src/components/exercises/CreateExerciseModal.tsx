'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { useToast } from '@/providers/ToastProvider'
import { createExerciseAction } from '@/app/(app)/exercises/actions'
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

const EQUIPMENT_OPTIONS = [
  'Barbell', 'Dumbbell', 'Cable', 'Machine',
  'Bodyweight', 'Kettlebell', 'Resistance Band', 'Smith Machine',
]

// ── Chip helpers ──────────────────────────────────────────────────────────────

function chipStyle(isSelected: boolean, accent = false) {
  if (isSelected && accent) {
    return { background: 'var(--accent-soft)', color: 'var(--accent)', border: '1px solid var(--accent-line)' }
  }
  if (isSelected) {
    return { background: 'var(--accent)', color: 'var(--accent-on)' }
  }
  return { background: 'rgba(255,255,255,0.04)', color: 'var(--text-mid)', border: '1px solid var(--glass-border)' }
}

const chipClass = 'py-2.5 px-2 rounded-[var(--radius-inner)] text-xs font-medium uppercase tracking-wider transition-all active:scale-95'

// ── Component ─────────────────────────────────────────────────────────────────

interface CreateExerciseModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateExerciseModal({ isOpen, onClose }: CreateExerciseModalProps) {
  const router = useRouter()
  const toast  = useToast()

  const [name,             setName]             = useState('')
  const [muscleGroup,      setMuscleGroup]      = useState<MuscleGroup | null>(null)
  const [secondaryMuscles, setSecondaryMuscles] = useState<MuscleGroup[]>([])
  const [movementPattern,  setMovementPattern]  = useState<MovementPattern | null>(null)
  const [equipment,        setEquipment]        = useState<string | null>(null)
  const [isPending,        startTransition]     = useTransition()

  function handleClose() {
    setName('')
    setMuscleGroup(null)
    setSecondaryMuscles([])
    setMovementPattern(null)
    setEquipment(null)
    onClose()
  }

  function toggleSecondary(mg: MuscleGroup) {
    setSecondaryMuscles(prev =>
      prev.includes(mg) ? prev.filter(m => m !== mg) : [...prev, mg]
    )
  }

  function toggleEquipment(eq: string) {
    setEquipment(prev => prev === eq ? null : eq)
  }

  function handleSave() {
    if (!muscleGroup || !movementPattern) return

    startTransition(async () => {
      const result = await createExerciseAction({
        name,
        muscle_group:      muscleGroup,
        secondary_muscles: secondaryMuscles,
        movement_pattern:  movementPattern,
        equipment:         equipment ? equipment.toLowerCase() : null,
      })

      if ('error' in result) {
        toast.error(result.error)
      } else {
        toast.success('Exercise created')
        handleClose()
        router.refresh()
        router.push(`/exercises/${result.id}`)
      }
    })
  }

  const canSave = name.trim().length > 0 && muscleGroup !== null && movementPattern !== null

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      title="New Exercise"
      icon={<Plus className="w-4 h-4" style={{ color: 'var(--accent)' }} />}
      position="center"
    >
      {/* Name */}
      <div className="mb-6">
        <p className="t-label mb-2">Exercise Name</p>
        <input
          type="text"
          placeholder="e.g. Weighted Pull-Up"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full h-11 px-4 rounded-[var(--radius-inner)] text-sm focus:outline-none transition-colors"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-hi)',
          }}
          autoFocus
        />
      </div>

      {/* Primary muscle */}
      <div className="mb-6">
        <p className="t-label mb-3">Primary Muscle <span style={{ color: 'var(--accent)' }}>*</span></p>
        <div className="grid grid-cols-3 gap-2">
          {MUSCLE_GROUPS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => {
                setMuscleGroup(value)
                setSecondaryMuscles(prev => prev.filter(m => m !== value))
              }}
              className={chipClass}
              style={chipStyle(muscleGroup === value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Secondary muscles */}
      <div className="mb-6">
        <p className="t-label mb-1">Secondary Muscles</p>
        <p className="text-xs mb-3" style={{ color: 'var(--text-faint)' }}>
          For compound lifts like bench press, pull-ups, rows
        </p>
        <div className="grid grid-cols-3 gap-2">
          {MUSCLE_GROUPS
            .filter(({ value }) => value !== muscleGroup)
            .map(({ value, label }) => (
              <button
                key={value}
                onClick={() => toggleSecondary(value)}
                className={chipClass}
                style={chipStyle(secondaryMuscles.includes(value), true)}
              >
                {label}
              </button>
            ))}
        </div>
      </div>

      {/* Movement pattern */}
      <div className="mb-6">
        <p className="t-label mb-3">Movement Pattern <span style={{ color: 'var(--accent)' }}>*</span></p>
        <div className="grid grid-cols-3 gap-2">
          {MOVEMENT_PATTERNS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setMovementPattern(value)}
              className={chipClass}
              style={chipStyle(movementPattern === value, true)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div className="mb-8">
        <p className="t-label mb-3">Equipment</p>
        <div className="grid grid-cols-2 gap-2">
          {EQUIPMENT_OPTIONS.map(eq => (
            <button
              key={eq}
              onClick={() => toggleEquipment(eq)}
              className={chipClass}
              style={chipStyle(equipment === eq)}
            >
              {eq}
            </button>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!canSave || isPending}
        className="w-full py-3.5 rounded-[var(--radius-pill)] font-semibold uppercase tracking-widest text-sm transition-all active:scale-95 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}
      >
        {isPending ? 'Creating…' : 'Create Exercise'}
      </button>
    </BottomSheet>
  )
}

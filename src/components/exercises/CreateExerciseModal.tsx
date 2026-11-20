'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button, Input, ToggleChip } from '@/components/ui'
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
  'Bodyweight', 'Kettlebell', 'Resistance band', 'Smith machine',
]

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
      title="New exercise"
      icon={<Plus className="w-4 h-4 text-secondary" />}
      position="center"
    >
      {/* Name */}
      <div className="mb-6">
        <p className="t-label mb-2">Exercise name</p>
        <Input
          type="text"
          placeholder="e.g. Weighted Pull-Up"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </div>

      {/* Primary muscle */}
      <div className="mb-6">
        <p className="t-label mb-3">Primary muscle <span className="text-secondary">*</span></p>
        <div className="grid grid-cols-3 gap-2">
          {MUSCLE_GROUPS.map(({ value, label }) => (
            <ToggleChip
              key={value}
              onClick={() => {
                setMuscleGroup(value)
                setSecondaryMuscles(prev => prev.filter(m => m !== value))
              }}
              selected={muscleGroup === value}
              className="px-2"
            >
              {label}
            </ToggleChip>
          ))}
        </div>
      </div>

      {/* Secondary muscles */}
      <div className="mb-6">
        <p className="t-label mb-1">Secondary muscles</p>
        <p className="text-xs mb-3 text-tertiary">
          For compound lifts like bench press, pull-ups, rows
        </p>
        <div className="grid grid-cols-3 gap-2">
          {MUSCLE_GROUPS
            .filter(({ value }) => value !== muscleGroup)
            .map(({ value, label }) => (
              <ToggleChip
                key={value}
                onClick={() => toggleSecondary(value)}
                selected={secondaryMuscles.includes(value)}
                className="px-2"
              >
                {label}
              </ToggleChip>
            ))}
        </div>
      </div>

      {/* Movement pattern */}
      <div className="mb-6">
        <p className="t-label mb-3">Movement pattern <span className="text-secondary">*</span></p>
        <div className="grid grid-cols-3 gap-2">
          {MOVEMENT_PATTERNS.map(({ value, label }) => (
            <ToggleChip
              key={value}
              onClick={() => setMovementPattern(value)}
              selected={movementPattern === value}
              className="px-2"
            >
              {label}
            </ToggleChip>
          ))}
        </div>
      </div>

      {/* Equipment */}
      <div className="mb-8">
        <p className="t-label mb-3">Equipment</p>
        <div className="grid grid-cols-2 gap-2">
          {EQUIPMENT_OPTIONS.map(eq => (
            <ToggleChip
              key={eq}
              onClick={() => toggleEquipment(eq)}
              selected={equipment === eq}
              className="px-2"
            >
              {eq}
            </ToggleChip>
          ))}
        </div>
      </div>

      {/* Save */}
      <Button onClick={handleSave} disabled={!canSave} loading={isPending}>
        {isPending ? 'Creating…' : 'Create exercise'}
      </Button>
    </BottomSheet>
  )
}

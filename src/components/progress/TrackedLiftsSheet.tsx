'use client'

import { useEffect, useMemo, useReducer, useState, useTransition, type Dispatch } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { BottomSheet, Button, IconButton, Input } from '@/components/ui'
import { SortableExerciseList } from '@/components/workout/SortableExerciseList'
import { useExerciseStore } from '@/store/exercise.store'
import { useToast } from '@/providers/ToastProvider'
import { getUserExerciseFrequency } from '@/app/(app)/workout/actions'
import { saveTrackedLiftsAction } from '@/app/(app)/progress/tracked-lifts-actions'
import { MAX_TRACKED_LIFTS } from '@/app/(app)/progress/tracked-lifts-schemas'
import { pickerReducer, type PickerAction } from '@/lib/tracked-lifts-picker'

export interface PickerOption {
  id: string
  name: string
  detail: string
  hasData: boolean
}

const SUGGESTION_COUNT = 8

interface ChoicesProps {
  picked: string[]
  options: PickerOption[]
  query: string
  error: string | null
  isSaving: boolean
  onQuery: (query: string) => void
  dispatch: Dispatch<PickerAction>
  onSave: () => void
  onUseAuto: () => void
}

export function TrackedLiftsChoices({ picked, options, query, error, isSaving, onQuery, dispatch, onSave, onUseAuto }: ChoicesProps) {
  const byId = new Map(options.map(option => [option.id, option]))
  const isFull = picked.length >= MAX_TRACKED_LIFTS
  const needle = query.trim().toLowerCase()
  const others = options.filter(option => !picked.includes(option.id) && (needle === '' || option.name.toLowerCase().includes(needle)))
  const shown = needle === '' ? others.slice(0, SUGGESTION_COUNT) : others

  return (
    <div className="space-y-3">
      <Input value={query} onChange={event => onQuery(event.target.value)} placeholder="Search exercises…" aria-label="Search exercises" />
      <p className="t-caption">{picked.length} of {MAX_TRACKED_LIFTS} picked{picked.length > 1 ? ' · drag to order' : ''}</p>

      {picked.length > 0 && (
        <SortableExerciseList
          blocks={picked.map(id => ({ id, clientIds: [id], label: byId.get(id)?.name ?? 'Lift' }))}
          onMove={(from, to) => dispatch({ type: 'move', from, to })}
          renderBlock={(block, handle) => (
            <div className="flex min-h-14 items-center gap-1 border-b border-border">
              {handle}
              <span className="min-w-0 flex-1">
                <span className="t-body block truncate">{block.label}</span>
                <OptionDetail option={byId.get(block.id)} />
              </span>
              <IconButton aria-label={`Remove ${block.label}`} onClick={() => dispatch({ type: 'toggle', id: block.id })}>
                <X className="h-5 w-5" aria-hidden="true" />
              </IconButton>
            </div>
          )}
        />
      )}

      <p className="t-label pt-2">{needle === '' ? 'You train often' : 'Results'}</p>
      <ul>
        {shown.map(option => (
          <li key={option.id} className="border-b border-border">
            <button
              type="button"
              disabled={isFull}
              aria-label={`Add ${option.name}`}
              onClick={() => dispatch({ type: 'toggle', id: option.id })}
              className="focus-ring flex min-h-14 w-full items-center gap-3 text-left disabled:opacity-40"
            >
              <Plus className="h-5 w-5 shrink-0 text-tertiary" aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="t-body block truncate">{option.name}</span>
                <OptionDetail option={option} />
              </span>
            </button>
          </li>
        ))}
        {shown.length === 0 && <li className="t-body-sm py-3">No exercises match.</li>}
      </ul>

      {error && <p role="alert" className="text-sm text-negative">{error}</p>}
      <Button onClick={onSave} loading={isSaving}>Save</Button>
      <button type="button" onClick={onUseAuto} disabled={isSaving} className="focus-ring mx-auto block min-h-11 rounded px-2 text-sm font-medium text-secondary">
        Use my most-trained lifts
      </button>
    </div>
  )
}

function OptionDetail({ option }: { option: PickerOption | undefined }) {
  if (!option) return null
  return <span className="t-caption block truncate">{option.hasData ? option.detail : 'No weighted sets in 12 weeks'}</span>
}

interface TrackedLiftsSheetProps {
  /** What the list shows now (picks, or the automatic lifts), in order. */
  initial: { id: string; name: string }[]
  /** Exercises with weighted sets in the last 12 weeks. */
  withData: string[]
  label: string
}

// The Edit / Pick lifts control and its sheet.
export function TrackedLiftsSheet({ initial, withData, label }: TrackedLiftsSheetProps) {
  const router = useRouter()
  const toast = useToast()
  const { exercises, load } = useExerciseStore()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [frequency, setFrequency] = useState<Record<string, number>>({})
  const [state, dispatch] = useReducer(pickerReducer, { picked: initial.map(lift => lift.id), error: null })
  const [isSaving, startSaving] = useTransition()

  useEffect(() => {
    if (!isOpen) return
    load()
    getUserExerciseFrequency()
      .then(setFrequency)
      .catch((error: unknown) => console.error('Failed to load exercise frequency', error))
  }, [isOpen, load])

  const options = useMemo(() => {
    const hasData = new Set(withData)
    const fromStore = exercises.map(exercise => ({
      id: exercise.id,
      name: exercise.name,
      detail: `${exercise.muscle_group} · ${frequency[exercise.id] ?? 0} sessions`,
      hasData: hasData.has(exercise.id),
    }))
    const known = new Set(fromStore.map(option => option.id))
    const missing = initial
      .filter(lift => !known.has(lift.id))
      .map(lift => ({ id: lift.id, name: lift.name, detail: '', hasData: hasData.has(lift.id) }))
    return [...missing, ...fromStore].sort((a, b) => (frequency[b.id] ?? 0) - (frequency[a.id] ?? 0))
  }, [exercises, frequency, initial, withData])

  const save = (ids: string[]) =>
    startSaving(async () => {
      const result = await saveTrackedLiftsAction(ids)
      if (!result.success) {
        console.error('Failed to save tracked lifts', result.error)
        toast.error('Couldn’t save your lifts. Try again.')
        return
      }
      setIsOpen(false)
      router.refresh()
    })

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="focus-ring min-h-11 rounded px-2 text-sm font-medium text-secondary">
        {label}
      </button>
      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="Your lifts">
        <TrackedLiftsChoices
          picked={state.picked}
          options={options}
          query={query}
          error={state.error}
          isSaving={isSaving}
          onQuery={setQuery}
          dispatch={dispatch}
          onSave={() => save(state.picked)}
          onUseAuto={() => { dispatch({ type: 'reset' }); save([]) }}
        />
      </BottomSheet>
    </>
  )
}

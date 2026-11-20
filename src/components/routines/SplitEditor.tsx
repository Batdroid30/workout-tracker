'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Moon, Plus, X } from 'lucide-react'
import { BottomSheet, Button, Card, IconButton, Input, ToggleChip } from '@/components/ui'
import { BackButton } from '@/components/ui/BackButton'
import { useToast } from '@/providers/ToastProvider'
import { useDialog } from '@/providers/DialogProvider'
import {
  deleteSplitAction,
  saveSplitAction,
  setActiveSplitAction,
  setSplitPositionAction,
} from '@/app/(app)/routines/split-actions'
import { MAX_SPLIT_ITEMS, SplitInputSchema } from '@/app/(app)/routines/split-schemas'
import type { SplitWithItems } from '@/lib/data/splits'

interface RoutineOption {
  id: string
  title: string
}

interface SplitEditorProps {
  split: SplitWithItems | null
  routines: RoutineOption[]
}

interface DraftItem {
  key: string
  routineId: string | null
}

function sameItems(a: DraftItem[], b: DraftItem[]): boolean {
  return a.length === b.length && a.every((item, index) => item.routineId === b[index].routineId)
}

function moveItem(items: DraftItem[], from: number, to: number): DraftItem[] {
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

export function SplitEditor({ split, routines }: SplitEditorProps) {
  const router = useRouter()
  const toast = useToast()
  const dialog = useDialog()
  const [isPending, startTransition] = useTransition()
  const [savedItems] = useState<DraftItem[]>(
    () => split?.items.map(item => ({ key: item.id, routineId: item.routineId })) ?? [],
  )
  const nextKey = useRef(0)
  const [name, setName] = useState(split?.name ?? '')
  const [items, setItems] = useState<DraftItem[]>(savedItems)
  const [makeActive, setMakeActive] = useState(split ? split.isActive : true)
  const [error, setError] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const titleFor = (routineId: string | null) =>
    routineId === null ? 'Rest' : routines.find(r => r.id === routineId)?.title ?? 'Deleted routine'
  const isFull = items.length >= MAX_SPLIT_ITEMS
  // Positions only line up with the saved split while the list is unchanged.
  const canStartFromHere = split !== null && sameItems(items, savedItems)

  const addItem = (routineId: string | null) => {
    nextKey.current += 1
    setItems(current => [...current, { key: `new-${nextKey.current}`, routineId }])
    setPickerOpen(false)
  }

  const save = () => {
    const input = { name, items: items.map(({ routineId }) => ({ routineId })) }
    const parsed = SplitInputSchema.safeParse(input)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your split')
      return
    }
    setError(null)
    startTransition(async () => {
      const saved = await saveSplitAction(split?.id ?? null, parsed.data)
      if (!saved.success) return setError(saved.error)
      if (makeActive && !split?.isActive && saved.id) {
        const activated = await setActiveSplitAction(saved.id)
        if (!activated.success) toast.error(activated.error)
      }
      router.push('/routines')
    })
  }

  const startFrom = (position: number) => {
    if (!split) return
    startTransition(async () => {
      const result = await setSplitPositionAction(split.id, position)
      if (!result.success) return toast.error(result.error)
      toast.success(`Up next: ${titleFor(items[position].routineId)}`)
      router.push('/routines')
    })
  }

  const remove = async () => {
    if (!split) return
    const confirmed = await dialog.confirm({
      title: 'Delete split',
      description: `Delete "${split.name}"? Your routines and workouts stay as they are.`,
      danger: true,
      confirmText: 'Delete',
    })
    if (!confirmed) return
    startTransition(async () => {
      const result = await deleteSplitAction(split.id)
      if (!result.success) return toast.error(result.error)
      router.push('/routines')
    })
  }

  return (
    <div className="min-h-screen px-5 pt-4 pb-36">
      <div className="-ml-2 mb-2">
        <BackButton fallbackHref="/routines" />
      </div>
      <h1 className="t-display-s mb-6">{split ? 'Edit split' : 'New split'}</h1>

      <label className="block mb-6">
        <span className="t-label mb-2 block">Name</span>
        <Input value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Push pull legs" maxLength={60} />
      </label>

      <h2 className="t-label mb-2">Days in order</h2>
      {items.length > 0 && (
        <Card padding="none">
          <ol>
            {items.map((item, index) => {
              const title = titleFor(item.routineId)
              return (
                <li key={item.key} className={`flex min-h-14 items-center gap-1 pl-4 pr-1 ${index > 0 ? 'border-t border-border' : ''}`}>
                  <span className="t-caption tabular-nums w-5 shrink-0">{index + 1}</span>
                  <span className={`min-w-0 flex-1 truncate ${item.routineId === null ? 't-body text-secondary' : 't-body'}`}>{title}</span>
                  {canStartFromHere && (
                    <Button variant="ghost" size="sm" fullWidth={false} disabled={isPending} onClick={() => startFrom(index)}>
                      Start from here
                    </Button>
                  )}
                  <IconButton aria-label={`Move ${title} up`} disabled={index === 0} onClick={() => setItems(moveItem(items, index, index - 1))}>
                    <ChevronUp className="w-5 h-5" aria-hidden="true" />
                  </IconButton>
                  <IconButton aria-label={`Move ${title} down`} disabled={index === items.length - 1} onClick={() => setItems(moveItem(items, index, index + 1))}>
                    <ChevronDown className="w-5 h-5" aria-hidden="true" />
                  </IconButton>
                  <IconButton aria-label={`Remove ${title}`} onClick={() => setItems(items.filter(other => other.key !== item.key))}>
                    <X className="w-5 h-5" aria-hidden="true" />
                  </IconButton>
                </li>
              )
            })}
          </ol>
        </Card>
      )}

      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size="sm" disabled={isFull} onClick={() => setPickerOpen(true)} leadingIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>
          Add routine
        </Button>
        <Button variant="secondary" size="sm" disabled={isFull} onClick={() => addItem(null)} leadingIcon={<Moon className="w-4 h-4" aria-hidden="true" />}>
          Add rest day
        </Button>
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-negative">{error}</p>}

      {!split?.isActive && (
        <div className="mt-6">
          <ToggleChip selected={makeActive} aria-pressed={makeActive} onClick={() => setMakeActive(value => !value)}>
            Active split
          </ToggleChip>
        </div>
      )}

      <div className="mt-8 space-y-3">
        <Button onClick={save} loading={isPending}>Save</Button>
        {split && (
          <Button variant="destructive" disabled={isPending} onClick={remove}>Delete split</Button>
        )}
      </div>

      <BottomSheet isOpen={pickerOpen} onClose={() => setPickerOpen(false)} title="Add routine">
        {routines.length === 0 ? (
          <p className="t-body-sm">Create a routine first, then add it to your split.</p>
        ) : (
          <ul className="space-y-2">
            {routines.map(routine => (
              <li key={routine.id}>
                <Button variant="secondary" onClick={() => addItem(routine.id)}>{routine.title}</Button>
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>
    </div>
  )
}

import { notFound } from 'next/navigation'
import { requireAuth } from '@/lib/auth'
import { getRoutines } from '@/lib/data/routines'
import { getSplits } from '@/lib/data/splits'
import { SplitEditor } from '@/components/routines/SplitEditor'

export const metadata = {
  title: 'Split | Lifts',
  description: 'Put your routines in order',
}

const NEW_SPLIT_ID = 'new'

export default async function SplitEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await requireAuth()
  const [routines, splits] = await Promise.all([getRoutines(userId), getSplits(userId)])

  // getSplits is scoped to this user, so another user's split id falls through to 404.
  const split = id === NEW_SPLIT_ID ? null : splits.find(candidate => candidate.id === id)
  if (split === undefined) notFound()

  const options = routines.map(routine => ({ id: routine.id, title: routine.title }))
  return <SplitEditor split={split} routines={options} />
}

import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { RoutineBuilderClient } from '@/components/routines/RoutineBuilderClient'

export const metadata = {
  title: 'Create routine | Lifts',
  description: 'Create a new workout routine',
}

export default async function CreateRoutinePage() {
  const { session } = await requireAuth()

  return <RoutineBuilderClient userId={session.user.id} />
}

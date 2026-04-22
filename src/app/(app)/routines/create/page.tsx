import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { RoutineBuilderClient } from '@/components/routines/RoutineBuilderClient'

export const metadata = {
  title: 'Create Routine | Lifts',
  description: 'Create a new workout routine',
}

export default async function CreateRoutinePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return <RoutineBuilderClient userId={session.user.id} />
}

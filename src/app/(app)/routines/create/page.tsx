import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { CreateRoutineClient } from './CreateRoutineClient'

export const metadata = {
  title: 'Create Routine | Lifts',
  description: 'Create a new workout routine',
}

export default async function CreateRoutinePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return <CreateRoutineClient userId={session.user.id} />
}

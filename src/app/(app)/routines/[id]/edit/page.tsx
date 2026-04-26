import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { RoutineBuilderClient } from '@/components/routines/RoutineBuilderClient'
import { getRoutineById } from '@/lib/data/routines'

export const metadata = {
  title: 'Edit Routine | Lifts',
  description: 'Edit your workout routine',
}

export default async function EditRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params
  
  try {
    const routine = await getRoutineById(id, session.user.id)
    if (routine.user_id !== session.user.id) {
      redirect('/routines')
    }
    
    return <RoutineBuilderClient userId={session.user.id} initialRoutine={routine} />
  } catch (err) {
    redirect('/routines')
  }
}

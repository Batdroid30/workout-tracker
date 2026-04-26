'use server'

import { auth } from '@/lib/auth'
import { parseHevyCSV, importWorkoutsFromHevy } from '@/lib/data/import'
import { evaluateAndSaveAllPRs } from '@/lib/data/stats'
import { revalidatePath } from 'next/cache'
import { bustAfterImport } from '@/lib/cache'

export async function importHevyCSVAction(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('User not authenticated')

  const userId = session.user.id
  const file   = formData.get('file') as File

  if (!file) return { success: false, error: 'No file provided' }

  try {
    const csvText = await file.text()
    const rows    = parseHevyCSV(csvText)

    if (rows.length === 0) return { success: false, error: 'Empty or invalid CSV file' }

    const results = await importWorkoutsFromHevy(userId, rows)
    await evaluateAndSaveAllPRs(userId)

    bustAfterImport(userId)
    revalidatePath('/dashboard')
    revalidatePath('/progress')
    revalidatePath('/profile')

    return { success: true, count: results.workoutsImported, errors: results.errors }
  } catch (error: any) {
    console.error('Import failed:', error)
    return { success: false, error: error.message }
  }
}

'use server'

import { auth } from '@/lib/auth'
import { parseHevyCSV, importWorkoutsFromHevy } from '@/lib/data/import'
import { revalidatePath } from 'next/cache'

export async function importHevyCSVAction(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error('User not authenticated')
  }

  const file = formData.get('file') as File
  if (!file) {
    return { success: false, error: 'No file provided' }
  }

  try {
    const csvText = await file.text()
    const rows = parseHevyCSV(csvText)
    
    if (rows.length === 0) {
      return { success: false, error: 'Empty or invalid CSV file' }
    }

    const results = await importWorkoutsFromHevy(session.user.id, rows)
    
    // Evaluate PRs for all imported data
    // This might be slow for many workouts, but necessary
    const { evaluateAndSaveAllPRs } = await import('@/lib/data/stats')
    await evaluateAndSaveAllPRs(session.user.id)

    revalidatePath('/dashboard')
    revalidatePath('/progress')
    revalidatePath('/profile')

    return { 
      success: true, 
      count: results.workoutsImported, 
      errors: results.errors 
    }
  } catch (error: any) {
    console.error('Import failed:', error)
    return { success: false, error: error.message }
  }
}

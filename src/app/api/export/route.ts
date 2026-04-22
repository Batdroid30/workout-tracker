import { auth } from '@/lib/auth'
import { getSupabaseServer } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const supabase = await getSupabaseServer()

  // Fetch all workouts with their exercises and sets
  const { data: workouts, error } = await supabase
    .from('workouts')
    .select(`
      id,
      title,
      started_at,
      completed_at,
      duration_seconds,
      workout_exercises (
        id,
        exercise:exercises (name),
        sets (
          set_number,
          weight_kg,
          reps,
          rpe,
          is_warmup
        )
      )
    `)
    .eq('user_id', session.user.id)
    .order('started_at', { ascending: false })

  if (error) {
    return new NextResponse('Failed to fetch data', { status: 500 })
  }

  // Build CSV
  const rows = [
    ['Date', 'Workout Title', 'Duration (s)', 'Exercise', 'Set Number', 'Weight (kg)', 'Reps', 'RPE', 'Is Warmup'].join(',')
  ]

  for (const workout of workouts || []) {
    const date = new Date(workout.started_at).toISOString()
    const title = `"${(workout.title || 'Workout').replace(/"/g, '""')}"`
    const duration = workout.duration_seconds || ''
    
    if (workout.workout_exercises && workout.workout_exercises.length > 0) {
      for (const we of workout.workout_exercises) {
        // @ts-ignore - foreign table join typing
        const exerciseName = `"${(we.exercise?.name || 'Unknown').replace(/"/g, '""')}"`
        
        if (we.sets && we.sets.length > 0) {
          // Sort sets by set_number
          we.sets.sort((a: any, b: any) => a.set_number - b.set_number)
          
          for (const set of we.sets) {
            rows.push([
              date,
              title,
              duration,
              exerciseName,
              set.set_number,
              set.weight_kg,
              set.reps,
              set.rpe || '',
              set.is_warmup ? 'true' : 'false'
            ].join(','))
          }
        }
      }
    } else {
      // Empty workout
      rows.push([date, title, duration, '', '', '', '', '', ''].join(','))
    }
  }

  const csv = rows.join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="lifts_export.csv"'
    }
  })
}

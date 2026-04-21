import { useState, useEffect } from 'react'
import { Exercise } from '@/types/database'
import { getSupabaseClient } from '@/lib/supabase/client'
import { DatabaseError } from '@/lib/errors'

export function useExercises(enabled: boolean = true) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) return

    let isMounted = true

    async function fetchExercises() {
      setLoading(true)
      setError(null)
      try {
        const supabase = getSupabaseClient()
        const { data, error: dbError } = await supabase
          .from('exercises')
          .select('*')
          .order('name', { ascending: true })
        
        if (dbError) throw new DatabaseError('Failed to fetch exercises', dbError)
        
        if (isMounted && data) {
          setExercises(data)
        }
      } catch (err) {
        console.error('Failed to fetch exercises:', err)
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch exercises'))
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchExercises()

    return () => {
      isMounted = false
    }
  }, [enabled])

  return { exercises, loading, error }
}

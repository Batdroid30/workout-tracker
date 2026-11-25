'use client'
import { useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui'
import { clearAllWorkoutDataAction } from '@/app/(app)/profile/actions'
import { useDialog } from '@/providers/DialogProvider'

export function ClearDataButton() {
  const [isLoading, setIsLoading] = useState(false)
  const dialog = useDialog()

  const handleClear = async () => {
    const confirmed = await dialog.confirm({
      title: 'Clear all data?',
      description: 'This will permanently delete all your workouts, sets, personal records, and custom exercises. This action cannot be undone.',
    })

    if (!confirmed) return

    setIsLoading(true)
    try {
      const result = await clearAllWorkoutDataAction()
      if (result.success) {
        dialog.alert({
          title: 'Success',
          description: 'All workout data has been cleared.',
        })
      } else {
        dialog.alert({
          title: 'Error',
          description: result.error || 'Failed to clear data.',
        })
      }
    } catch (error: unknown) {
      dialog.alert({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      fullWidth={false}
      onClick={handleClear}
      loading={isLoading}
      leadingIcon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
      className="text-negative hover:text-negative"
    >
      Clear all data
    </Button>
  )
}

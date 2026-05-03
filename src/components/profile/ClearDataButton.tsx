'use client'
import { useState } from 'react'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { clearAllWorkoutDataAction } from '@/app/(app)/profile/actions'
import { useDialog } from '@/providers/DialogProvider'

export function ClearDataButton() {
  const [isLoading, setIsLoading] = useState(false)
  const dialog = useDialog()

  const handleClear = async () => {
    const confirmed = await dialog.confirm({
      title: 'Clear All Data?',
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
    <button
      onClick={handleClear}
      disabled={isLoading}
      className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-widest transition-colors py-2 hover:text-red-400 disabled:opacity-40"
      style={{ color: 'var(--text-faint)' }}
    >
      {isLoading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Trash2 className="w-3 h-3" />
      )}
      <span>Clear All Data</span>
    </button>
  )
}

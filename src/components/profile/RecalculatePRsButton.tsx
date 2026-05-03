'use client'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { recalculatePRsAction } from '@/app/(app)/profile/actions'
import { useDialog } from '@/providers/DialogProvider'

export function RecalculatePRsButton() {
  const [isLoading, setIsLoading] = useState(false)
  const dialog = useDialog()

  const handleRecalculate = async () => {
    setIsLoading(true)
    try {
      const result = await recalculatePRsAction()
      if (result.success) {
        dialog.alert({
          title: 'PRs Updated',
          description: 'All personal records have been recalculated from your full workout history.',
        })
      } else {
        dialog.alert({
          title: 'Error',
          description: result.error || 'Failed to recalculate PRs.',
        })
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
      dialog.alert({ title: 'Error', description: message })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleRecalculate}
      disabled={isLoading}
      className="flex items-center gap-1.5 text-[9px] font-medium uppercase tracking-widest transition-colors disabled:opacity-50 hover:opacity-80"
      style={{ color: 'var(--text-mid)' }}
    >
      <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
      <span>{isLoading ? 'Recalculating...' : 'Recalculate'}</span>
    </button>
  )
}

'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex h-screen flex-col items-center justify-center bg-bg text-primary p-4">
      <h2 className="text-2xl font-bold font-sans mb-4">Something went wrong!</h2>
      <p className="text-secondary font-mono text-sm mb-8 max-w-md text-center">
        {error.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <Button onClick={() => reset()} fullWidth={false}>
        Try again
      </Button>
    </div>
  )
}

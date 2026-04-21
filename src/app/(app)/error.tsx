'use client'

import { useEffect } from 'react'

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
    <div className="flex h-screen flex-col items-center justify-center bg-black text-white p-4">
      <h2 className="text-2xl font-bold font-sans mb-4">Something went wrong!</h2>
      <p className="text-zinc-500 font-mono text-sm mb-8 max-w-md text-center">
        {error.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <button
        onClick={() => reset()}
        className="bg-brand text-white font-bold font-sans text-sm px-6 py-3 rounded-xl hover:bg-brand-hover transition-colors"
      >
        Try again
      </button>
    </div>
  )
}

'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { IconButton } from './IconButton'

// A page opened directly (bookmark, PWA launch, redirect) has no earlier
// entry in this tab, so going back would do nothing or leave the app.
export function canGoBack(historyLength: number): boolean {
  return historyLength > 1
}

interface BackButtonProps {
  fallbackHref?: string
}

export function BackButton({ fallbackHref }: BackButtonProps) {
  const router = useRouter()

  const handleBack = () => {
    if (fallbackHref && !canGoBack(window.history.length)) {
      router.push(fallbackHref)
      return
    }
    router.back()
  }

  return (
    <IconButton aria-label="Go back" onClick={handleBack}>
      <ArrowLeft className="w-5 h-5" />
    </IconButton>
  )
}

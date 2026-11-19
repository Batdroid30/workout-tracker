'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { IconButton } from './IconButton'

export function BackButton() {
  const router = useRouter()

  return (
    <IconButton aria-label="Go back" onClick={() => router.back()}>
      <ArrowLeft className="w-5 h-5" />
    </IconButton>
  )
}

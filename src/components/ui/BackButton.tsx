'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

export function BackButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.back()}
      className="p-2.5 rounded-[var(--radius-inner)] transition-colors hover:bg-white/[0.06]"
      style={{ color: 'var(--text-mid)' }}
      aria-label="Go back"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  )
}

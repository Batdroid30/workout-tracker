'use client'

import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { useWorkoutStore } from '@/store/workout.store'

export function StartEmptyWorkout() {
  const router       = useRouter()
  const startWorkout = useWorkoutStore(state => state.startWorkout)

  const handleStart = () => {
    startWorkout()
    router.push('/workout')
  }

  return (
    <button
      onClick={handleStart}
      className="w-full group relative overflow-hidden rounded-[var(--radius-card)] p-5 flex items-center gap-4 text-left active:scale-[0.98] transition-transform"
      style={{
        background: 'linear-gradient(135deg, rgba(243,192,138,0.18) 0%, rgba(243,192,138,0.06) 100%)',
        border: '1px solid var(--accent-line)',
        boxShadow: '0 0 40px rgba(243,192,138,0.08)',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute right-0 top-0 w-48 h-48 -translate-y-1/4 translate-x-1/4 rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'var(--accent)' }}
      />

      {/* Icon */}
      <div
        className="relative z-10 w-12 h-12 rounded-[var(--radius-inner)] flex items-center justify-center shrink-0"
        style={{ background: 'var(--accent)' }}
      >
        <Plus className="w-5 h-5" style={{ color: 'var(--accent-on)' }} />
      </div>

      {/* Text */}
      <div className="relative z-10">
        <p className="text-[15px] font-semibold text-[var(--text-hi)] leading-tight">
          Start empty session
        </p>
        <p className="text-[12px] text-[var(--text-mid)] mt-0.5">
          Build your workout on the fly
        </p>
      </div>
    </button>
  )
}

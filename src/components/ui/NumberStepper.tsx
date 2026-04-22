'use client'
import { useState, useEffect } from 'react'

interface NumberStepperProps {
  value: number
  onChange: (val: number) => void
  step?: number
  min?: number
  max?: number
}

export function NumberStepper({ value, onChange, step = 1, min = 0, max = 999 }: NumberStepperProps) {
  // Local state for immediate typing feedback
  const [localStr, setLocalStr] = useState(value.toString())
  
  useEffect(() => {
    setLocalStr(value.toString())
  }, [value])

  const handleDecrement = () => {
    const next = Math.max(min, value - step)
    onChange(next)
  }

  const handleIncrement = () => {
    const next = Math.min(max, value + step)
    onChange(next)
  }

  const handleBlur = () => {
    const parsed = parseFloat(localStr)
    if (isNaN(parsed)) {
      setLocalStr(value.toString())
    } else {
      const clamped = Math.min(Math.max(parsed, min), max)
      onChange(clamped)
      setLocalStr(clamped.toString())
    }
  }

  return (
    <div className="flex items-center h-12 bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all">
      <input 
        type="text" 
        inputMode="decimal"
        className="flex-1 w-full bg-transparent text-center font-mono font-bold text-lg text-white focus:outline-none px-2"
        value={localStr}
        onChange={(e) => setLocalStr(e.target.value)}
        onBlur={handleBlur}
      />
    </div>
  )
}

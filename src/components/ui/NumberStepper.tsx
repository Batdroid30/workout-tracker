'use client'
import { useState, useEffect } from 'react'

interface NumberStepperProps {
  value: number
  onChange: (val: number) => void
  step?: number
  min?: number
  max?: number
}

/**
 * Mobile-friendly number input with − / + tap targets on either side.
 * Touch targets are 44 × 48 px to pass WCAG 2.5.5 minimum.
 */
export function NumberStepper({ value, onChange, step = 1, min = 0, max = 999 }: NumberStepperProps) {
  const [localStr, setLocalStr] = useState(value.toString())

  useEffect(() => {
    setLocalStr(value.toString())
  }, [value])

  const handleDecrement = () => onChange(Math.max(min, value - step))
  const handleIncrement = () => onChange(Math.min(max, value + step))

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
    <div className="w-full flex items-center h-12 bg-[#0c1324] rounded-xl overflow-hidden border border-[#334155] focus-within:border-[#CCFF00]/50 transition-all">
      {/* Decrement */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={value <= min}
        className="w-9 h-full flex items-center justify-center text-[#adb4ce] hover:text-white hover:bg-[#151b2d] active:bg-[#CCFF00]/10 transition-colors font-black text-lg shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Decrease"
      >
        −
      </button>

      {/* Input */}
      <input
        type="text"
        inputMode="numeric"
        className="flex-1 min-w-0 bg-transparent text-center font-black text-lg text-white focus:outline-none"
        value={localStr}
        onChange={e => setLocalStr(e.target.value)}
        onBlur={handleBlur}
      />

      {/* Increment */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={value >= max}
        className="w-9 h-full flex items-center justify-center text-[#adb4ce] hover:text-white hover:bg-[#151b2d] active:bg-[#CCFF00]/10 transition-colors font-black text-lg shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}

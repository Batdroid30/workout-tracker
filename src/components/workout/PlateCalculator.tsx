'use client'

import { useState } from 'react'
import { X, Calculator } from 'lucide-react'

const BAR_KG  = 20
const PLATES  = [25, 20, 15, 10, 5, 2.5, 1.25] // kg, heaviest first

// Plate colours loosely match standard bumper/iron plate conventions
const PLATE_COLOURS: Record<number, string> = {
  25:   'bg-red-500/20    border-red-500/40    text-red-400',
  20:   'bg-blue-500/20   border-blue-500/40   text-blue-400',
  15:   'bg-yellow-500/20 border-yellow-500/40 text-yellow-400',
}

interface PlateSet {
  plate: number
  count: number
}

function calculatePlates(targetKg: number): PlateSet[] {
  const perSide = (targetKg - BAR_KG) / 2
  if (perSide <= 0) return []

  let remaining = perSide
  const result: PlateSet[] = []

  for (const plate of PLATES) {
    const count = Math.floor(remaining / plate + 0.001)
    if (count > 0) {
      result.push({ plate, count })
      remaining = Math.round((remaining - plate * count) * 1000) / 1000
    }
  }

  return result
}

function achievableWeight(plates: PlateSet[]): number {
  return BAR_KG + plates.reduce((sum, p) => sum + p.plate * p.count * 2, 0)
}

interface PlateCalculatorProps {
  isOpen: boolean
  onClose: () => void
  initialWeight?: number
}

export function PlateCalculator({ isOpen, onClose, initialWeight = 100 }: PlateCalculatorProps) {
  const [target, setTarget] = useState(
    Math.max(BAR_KG, Math.round((initialWeight || 100) / 2.5) * 2.5)
  )

  if (!isOpen) return null

  const plates  = calculatePlates(target)
  const actual  = achievableWeight(plates)
  const isExact = actual === target
  const perSide = (target - BAR_KG) / 2

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      <div
        className="relative w-full rounded-t-sheet p-5 pb-8 bg-surface-raised border-t border-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-secondary" />
            <h2 className="text-sm font-semibold text-primary">
              Plate calculator
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-lg transition-colors text-tertiary hover:bg-surface"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Weight selector */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            onClick={() => setTarget(t => Math.max(BAR_KG, t - 2.5))}
            className="w-12 h-12 rounded-control font-semibold text-xl text-primary bg-surface border border-border active:scale-95 transition-all hover:opacity-80"
          >−</button>

          <div className="text-center min-w-[100px]">
            <p className="mono text-5xl tracking-tighter tabular-nums text-primary">
              {target}
            </p>
            <p className="t-label mt-1">kg total</p>
          </div>

          <button
            onClick={() => setTarget(t => t + 2.5)}
            className="w-12 h-12 rounded-control font-semibold text-xl text-primary bg-surface border border-border active:scale-95 transition-all hover:opacity-80"
          >+</button>
        </div>

        {/* Plate layout */}
        <div
          className="rounded-control p-4 bg-surface border border-border"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="t-label">Per side · {perSide > 0 ? `${perSide} kg` : 'bar only'}</p>
            <p className="t-label">Bar: {BAR_KG} kg</p>
          </div>

          {plates.length === 0 ? (
            <p className="t-caption text-center py-3">Just the bar ({BAR_KG} kg)</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {plates.flatMap(({ plate, count }) =>
                Array.from({ length: count }, (_, i) => {
                  const colourClass = PLATE_COLOURS[plate]
                  return colourClass ? (
                    <div
                      key={`${plate}-${i}`}
                      className={`h-9 px-3 rounded-lg border flex items-center font-semibold text-sm ${colourClass}`}
                    >
                      {plate}
                    </div>
                  ) : (
                    <div
                      key={`${plate}-${i}`}
                      className={`h-9 px-3 rounded-lg flex items-center font-semibold text-sm bg-surface-raised border border-border ${plate <= 2.5 ? 'text-tertiary' : 'text-secondary'}`}
                    >
                      {plate}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {!isExact && plates.length > 0 && (
            <p className="text-xs text-caution font-medium mt-3">
              Closest achievable: {actual} kg
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

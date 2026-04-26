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
  10:   'bg-[#151b2d]     border-[#334155]     text-white',
  5:    'bg-[#151b2d]     border-[#334155]     text-white',
  2.5:  'bg-[#151b2d]     border-[#334155]     text-[#adb4ce]',
  1.25: 'bg-[#151b2d]     border-[#334155]     text-[#4a5568]',
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
    const count = Math.floor(remaining / plate + 0.001) // tolerance for floating point
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

  const plates   = calculatePlates(target)
  const actual   = achievableWeight(plates)
  const isExact  = actual === target
  const perSide  = (target - BAR_KG) / 2

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full bg-[#0c1324] border-t border-[#334155] rounded-t-2xl p-5 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#CCFF00]" />
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Plate Calculator</h2>
          </div>
          <button onClick={onClose} className="text-[#4a5568] hover:text-white p-2.5 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Weight selector */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <button
            onClick={() => setTarget(t => Math.max(BAR_KG, t - 2.5))}
            className="w-12 h-12 bg-[#151b2d] border border-[#334155] rounded-xl font-black text-white text-xl hover:border-[#CCFF00]/50 active:scale-95 transition-all"
          >−</button>

          <div className="text-center min-w-[100px]">
            <p className="text-5xl font-black text-white tracking-tighter tabular-nums">{target}</p>
            <p className="text-[9px] font-black text-[#4a5568] uppercase tracking-widest mt-1">kg total</p>
          </div>

          <button
            onClick={() => setTarget(t => t + 2.5)}
            className="w-12 h-12 bg-[#151b2d] border border-[#334155] rounded-xl font-black text-white text-xl hover:border-[#CCFF00]/50 active:scale-95 transition-all"
          >+</button>
        </div>

        {/* Plate layout */}
        <div className="bg-[#151b2d] border border-[#1e293b] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-black text-[#334155] uppercase tracking-widest">
              Per side · {perSide > 0 ? `${perSide} kg` : 'bar only'}
            </p>
            <p className="text-[9px] font-black text-[#334155] uppercase tracking-widest">
              Bar: {BAR_KG} kg
            </p>
          </div>

          {plates.length === 0 ? (
            <p className="text-sm text-[#4a5568] font-body text-center py-3">Just the bar ({BAR_KG} kg)</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {plates.flatMap(({ plate, count }) =>
                Array.from({ length: count }, (_, i) => (
                  <div
                    key={`${plate}-${i}`}
                    className={`h-9 px-3 rounded-lg border flex items-center font-black text-sm ${PLATE_COLOURS[plate] ?? PLATE_COLOURS[2.5]}`}
                  >
                    {plate}
                  </div>
                ))
              )}
            </div>
          )}

          {!isExact && plates.length > 0 && (
            <p className="text-[10px] text-orange-400 font-black mt-3">
              Closest achievable: {actual} kg
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

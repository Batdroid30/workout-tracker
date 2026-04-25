/** Rounds a weight to the nearest barbell-friendly increment (default 2.5 kg). */
function snapToBar(weight: number, step = 2.5): number {
  return Math.round(weight / step) * step
}

interface WarmupRampProps {
  workingWeight: number
}

const RAMP: { pct: number; reps: number }[] = [
  { pct: 0.4, reps: 5 },
  { pct: 0.6, reps: 3 },
  { pct: 0.8, reps: 2 },
]

/**
 * Shows three progressive warmup sets (40/60/80 % of working weight).
 * Only renders when working weight ≥ 20 kg — below that it's bodyweight/
 * machine work and warmup math doesn't apply.
 */
export function WarmupRamp({ workingWeight }: WarmupRampProps) {
  if (workingWeight < 20) return null

  const sets = RAMP.map(r => ({ weight: snapToBar(workingWeight * r.pct), reps: r.reps }))

  return (
    <div className="px-4 py-2.5 border-b border-[#1e293b] bg-[#0c1324]/60">
      <p className="text-[9px] font-black text-[#334155] uppercase tracking-widest mb-2">Warmup ramp</p>
      <div className="flex items-center gap-1">
        {sets.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="text-[11px] font-black text-[#4a5568]">{s.weight}</span>
            <span className="text-[9px] text-[#334155]">×{s.reps}</span>
            {i < sets.length - 1 && (
              <span className="text-[#1e293b] mx-1 text-xs">›</span>
            )}
          </div>
        ))}
        <span className="text-[9px] text-[#334155] ml-1">kg</span>
      </div>
    </div>
  )
}

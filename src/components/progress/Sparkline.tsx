const WIDTH = 64
const HEIGHT = 28
const PAD = 3

// A tiny trend line; the stroke colour comes from the parent's text colour.
export function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <span className="inline-block" style={{ width: WIDTH, height: HEIGHT }} aria-hidden="true" />
  const min = Math.min(...points)
  const range = Math.max(...points) - min || 1
  const step = WIDTH / (points.length - 1)
  const coords = points
    .map((value, index) => `${(index * step).toFixed(1)},${(HEIGHT - PAD - ((value - min) / range) * (HEIGHT - PAD * 2)).toFixed(1)}`)
    .join(' ')
  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" className="shrink-0">
      <polyline points={coords} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

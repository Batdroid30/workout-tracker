interface WeeklyRingProps {
  done: number
  goal: number
}

const R = 76
const CX = 100
const CY = 100
const SIZE = 200
const STROKE = 9
const CIRCUMFERENCE = 2 * Math.PI * R
const ARC_FRACTION = 270 / 360        // 270° arc, 90° gap at bottom
const ARC_LENGTH = CIRCUMFERENCE * ARC_FRACTION
const START_ANGLE = 135               // rotates gap to bottom-center

export function WeeklyRing({ done, goal }: WeeklyRingProps) {
  const pct = goal > 0 ? Math.min(1, done / goal) : 0
  const fillLength = ARC_LENGTH * pct
  const isComplete = done >= goal

  const trackDash = `${ARC_LENGTH.toFixed(2)} ${(CIRCUMFERENCE - ARC_LENGTH).toFixed(2)}`
  const fillDash  = `${fillLength.toFixed(2)} ${(CIRCUMFERENCE - fillLength).toFixed(2)}`

  return (
    <div
      className="relative"
      style={{ width: SIZE, height: SIZE }}
      role="img"
      aria-label={`${done} of ${goal} sessions completed this week`}
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        className="absolute inset-0"
      >
        {/* Track */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={STROKE}
          strokeDasharray={trackDash}
          strokeLinecap="round"
          transform={`rotate(${START_ANGLE} ${CX} ${CY})`}
        />

        {/* Fill */}
        {done > 0 && (
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={STROKE}
            strokeDasharray={fillDash}
            strokeLinecap="round"
            transform={`rotate(${START_ANGLE} ${CX} ${CY})`}
            style={{
              filter: isComplete
                ? 'drop-shadow(0 0 14px var(--accent-glow)) drop-shadow(0 0 5px var(--accent-glow))'
                : 'drop-shadow(0 0 8px var(--accent-glow))',
            }}
          />
        )}
      </svg>

      {/* Center text — HTML overlay for crisp rendering */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p
          className="mono font-bold leading-none tracking-tight tabular-nums"
          style={{
            fontSize: 52,
            color: 'var(--text-hi)',
            textShadow: done > 0 ? '0 0 40px var(--accent-glow)' : 'none',
          }}
        >
          {done}
        </p>
        <p className="text-[11px] mt-2" style={{ color: 'var(--text-low)' }}>
          of {goal} sessions
        </p>
        {isComplete && (
          <p
            className="text-[9px] font-semibold uppercase tracking-widest mt-1"
            style={{ color: 'var(--accent)' }}
          >
            Goal hit ✦
          </p>
        )}
      </div>
    </div>
  )
}

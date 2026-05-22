'use client'

import React from 'react'

interface WeeklyRingProps {
  done: number
  goal: number
}

// Compact size geometry constants for side-by-side layout
const R = 50
const CX = 65
const CY = 65
const SIZE = 130
const STROKE = 7
const CIRCUMFERENCE = 2 * Math.PI * R // ≈ 314.16
const ARC_FRACTION = 270 / 360 // 270° arc, 90° gap at bottom
const ARC_LENGTH = CIRCUMFERENCE * ARC_FRACTION // ≈ 235.62
const START_ANGLE = 135 // rotates gap to bottom-center

export function WeeklyRing({ done, goal }: WeeklyRingProps) {
  const pct = goal > 0 ? Math.min(1, done / goal) : 0
  const fillLength = ARC_LENGTH * pct
  const isComplete = done >= goal

  const trackDash = `${ARC_LENGTH.toFixed(2)} ${(CIRCUMFERENCE - ARC_LENGTH).toFixed(2)}`
  const fillDash  = `${fillLength.toFixed(2)} ${(CIRCUMFERENCE - fillLength).toFixed(2)}`

  return (
    <div
      className="relative shrink-0 select-none"
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
          stroke="rgba(255,255,255,0.05)"
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
                ? 'drop-shadow(0 0 10px var(--accent-glow)) drop-shadow(0 0 4px var(--accent-glow))'
                : 'drop-shadow(0 0 6px var(--accent-glow))',
            }}
          />
        )}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p
          className="mono font-bold leading-none tracking-tight tabular-nums"
          style={{
            fontSize: 32,
            color: 'var(--text-hi)',
            textShadow: done > 0 ? '0 0 30px var(--accent-glow)' : 'none',
          }}
        >
          {done}
        </p>
        <p className="text-[9px] mt-1.5 font-medium tracking-normal text-[var(--text-low)]">
          of {goal} sessions
        </p>
      </div>
    </div>
  )
}

interface FatigueAssessment {
  shouldSuggest: boolean
  confidence: 'low' | 'medium' | 'high'
  signals: string[]
}

interface FatigueRingProps {
  assessment: FatigueAssessment
}

export function FatigueRing({ assessment }: FatigueRingProps) {
  // Map fatigue signals to percentage, label and color
  let pct = 0.15
  let label = 'Low'
  let strokeColor = '#10b981' // emerald
  let glowColor = 'rgba(16,185,129,0.4)'

  if (assessment.shouldSuggest) {
    if (assessment.confidence === 'low') {
      pct = 0.50
      label = 'Mod'
      strokeColor = '#f59e0b' // amber
      glowColor = 'rgba(245,158,11,0.4)'
    } else if (assessment.confidence === 'medium') {
      pct = 0.75
      label = 'High'
      strokeColor = 'var(--accent)' // accent crimson
      glowColor = 'var(--accent-glow)'
    } else {
      pct = 0.95
      label = 'Crit'
      strokeColor = '#ef4444' // rose/red
      glowColor = 'rgba(239,68,68,0.5)'
    }
  }

  const fillLength = ARC_LENGTH * pct
  const trackDash = `${ARC_LENGTH.toFixed(2)} ${(CIRCUMFERENCE - ARC_LENGTH).toFixed(2)}`
  const fillDash  = `${fillLength.toFixed(2)} ${(CIRCUMFERENCE - fillLength).toFixed(2)}`

  return (
    <div
      className="relative shrink-0 select-none"
      style={{ width: SIZE, height: SIZE }}
      role="img"
      aria-label={`CNS Fatigue Level is ${label}`}
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
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={STROKE}
          strokeDasharray={trackDash}
          strokeLinecap="round"
          transform={`rotate(${START_ANGLE} ${CX} ${CY})`}
        />

        {/* Fill */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke={strokeColor}
          strokeWidth={STROKE}
          strokeDasharray={fillDash}
          strokeLinecap="round"
          transform={`rotate(${START_ANGLE} ${CX} ${CY})`}
          style={{
            filter: `drop-shadow(0 0 8px ${glowColor})`,
          }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p
          className="font-bold leading-none tracking-tight"
          style={{
            fontSize: 26,
            color: 'var(--text-hi)',
            textShadow: `0 0 30px ${glowColor}`,
          }}
        >
          {label}
        </p>
        <p className="text-[9px] mt-1.5 font-medium tracking-normal text-[var(--text-low)]">
          CNS Fatigue
        </p>
      </div>
    </div>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Activity, CheckCircle2 } from 'lucide-react'
import { IconButton } from '@/components/ui'

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
          stroke="var(--border-strong)"
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
            stroke="var(--text-primary)"
            strokeWidth={STROKE}
            strokeDasharray={fillDash}
            strokeLinecap="round"
            transform={`rotate(${START_ANGLE} ${CX} ${CY})`}
          />
        )}
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p
          className="mono font-bold leading-none tracking-tight tabular-nums text-primary"
          style={{ fontSize: 32 }}
        >
          {done}
        </p>
        <p className="text-xs mt-1.5 font-medium tracking-normal text-tertiary">
          of {goal} sessions
        </p>
      </div>
    </div>
  )
}

interface FatigueAssessment {
  shouldSuggest: boolean
  confidence: 'low' | 'medium' | 'high'
  score: number
  signals: string[]
}

interface FatigueRingProps {
  assessment: FatigueAssessment
}

export function FatigueRing({ assessment }: FatigueRingProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Map fatigue signals to percentage, label and color
  let pct = 0.15
  let label = 'Low'
  let strokeColor = 'var(--positive)'

  if (assessment.shouldSuggest) {
    if (assessment.confidence === 'low') {
      pct = 0.50
      label = 'Mod'
      strokeColor = 'var(--caution)'
    } else if (assessment.confidence === 'medium') {
      pct = 0.75
      label = 'High'
      strokeColor = 'var(--negative)'
    } else {
      pct = 0.95
      label = 'Crit'
      strokeColor = 'var(--negative)'
    }
  }

  const fillLength = ARC_LENGTH * pct
  const trackDash = `${ARC_LENGTH.toFixed(2)} ${(CIRCUMFERENCE - ARC_LENGTH).toFixed(2)}`
  const fillDash  = `${fillLength.toFixed(2)} ${(CIRCUMFERENCE - fillLength).toFixed(2)}`

  return (
    <>
      <div
        className="relative shrink-0 select-none cursor-pointer transition-transform hover:scale-105 active:scale-95"
        style={{ width: SIZE, height: SIZE }}
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(true)}
        onKeyDown={(e) => e.key === 'Enter' && setIsOpen(true)}
        aria-label={`CNS Fatigue Level is ${label}. Click to view signals.`}
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
          stroke="var(--border-strong)"
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
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <p className="font-bold leading-none tracking-tight text-primary" style={{ fontSize: 26 }}>
          {label}
        </p>
        <p className="text-xs mt-1.5 font-medium tracking-normal text-tertiary">
          CNS fatigue
        </p>
      </div>
      </div>
      
      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-sm bg-surface-raised border border-border-strong rounded-card overflow-hidden shadow-[var(--shadow-overlay)] animate-in zoom-in-95 duration-200">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-primary">
                    Real-time signals
                  </h3>
                </div>
                <IconButton onClick={() => setIsOpen(false)} aria-label="Close">
                  <X className="w-5 h-5" />
                </IconButton>
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-secondary">Current status</span>
                  <span className="text-xs font-bold" style={{ color: strokeColor }}>
                    {label} fatigue
                  </span>
                </div>
                <div className="h-1.5 w-full bg-surface rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct * 100}%`, backgroundColor: strokeColor }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {assessment.signals.length > 0 ? (
                  assessment.signals.map((signal, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-3 rounded-control bg-surface border border-border">
                      <span className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: strokeColor }} />
                      <p className="text-sm font-medium text-primary leading-snug">{signal}</p>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center text-center p-4 rounded-control bg-surface border border-border">
                    <CheckCircle2 className="w-8 h-8 text-positive mb-2" />
                    <p className="text-sm font-semibold text-primary">CNS is fully recovered</p>
                    <p className="text-xs text-secondary mt-1">Optimal time to push for PRs and add volume.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

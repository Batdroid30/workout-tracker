'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Activity, CheckCircle2 } from 'lucide-react'

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
      
      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal */}
          <div className="relative w-full max-w-sm bg-[#07061A] border border-[var(--accent-line)] rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-200">
            {/* Header glow */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--accent)] to-[var(--cyan)]" />
            
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--accent)]" />
                  <h3 className="text-sm font-bold tracking-widest uppercase text-[var(--text-hi)]">
                    Real-time Signals
                  </h3>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full hover:bg-white/10 transition-colors text-[var(--text-low)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[var(--text-mid)]">Current Status</span>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color: strokeColor }}>
                    {label} Fatigue
                  </span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct * 100}%`, backgroundColor: strokeColor, boxShadow: `0 0 10px ${glowColor}` }}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {assessment.signals.length > 0 ? (
                  assessment.signals.map((signal, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5">
                      <span className="mt-0.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: strokeColor, boxShadow: `0 0 8px ${glowColor}` }} />
                      <p className="text-sm font-medium text-[var(--text-hi)] leading-snug">{signal}</p>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white/5 border border-white/5">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mb-2 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <p className="text-sm font-semibold text-[var(--text-hi)]">CNS is fully recovered</p>
                    <p className="text-xs text-[var(--text-mid)] mt-1">Optimal time to push for PRs and add volume.</p>
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

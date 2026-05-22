'use client'

import Link from 'next/link'
import {
  Dumbbell,
  Scale,
  Activity,
  ChevronRight,
  Sparkles,
  Flame,
  Compass,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types/database'

// Sub-components
import { DeloadCard } from './DeloadCard'
import { ThisWeekCard } from './ThisWeekCard'
import { PhaseCoachCard } from './PhaseCoachCard'
import { MomentumStrip } from './MomentumStrip'
import { PhaseTransitionCard } from './PhaseTransitionCard'
import { HypertrophicDissociationCard } from './HypertrophicDissociationCard'
import { WorkoutHistoryList } from '@/components/workout/WorkoutHistoryList'
import { BodyweightLogger } from '@/components/progress/BodyweightLogger'
import { WeeklyRing, FatigueRing } from './WeeklyRing'

interface DashboardTabsProps {
  userId: string
  firstName: string
  greeting: string
  dateLabel: string
  avatarUrl: string | null
  initial: string
  totalWorkouts: number
  totalVolume: number
  weeklyGoalSessions: number
  recentWorkouts: any[]
  latestBodyweight: any | null
  streak: any
  weeks: any[]
  recentPRs: any[]
  profile: Profile | null

  // Coaching / Insights pre-resolved on Server
  mostImproved: any[]
  neglectedMuscles: any[]
  stalledMovements: any[]
  badges: any[]
  pushPull: any
  keyLifts: any[]
  recentLoads: any[]
  bwHistory: any[]
  volumeLandmarks: any[]
  strengthIndex: any
  dissociation: any
  weeklySummary: any
  fatigue: any
  isDeloadWeek: boolean
  nextWorkout: any
  mesocycle: any
  missions: any[]
  phaseLabel: string | null
  phaseWeek: number | null
  cycleLength: number | null
}

export function DashboardTabs({
  userId,
  firstName,
  greeting,
  dateLabel,
  avatarUrl,
  initial,
  totalWorkouts,
  totalVolume,
  weeklyGoalSessions,
  recentWorkouts,
  latestBodyweight,
  streak,
  weeks,
  recentPRs,
  profile,
  mostImproved,
  neglectedMuscles,
  stalledMovements,
  badges,
  pushPull,
  keyLifts,
  recentLoads,
  bwHistory,
  volumeLandmarks,
  strengthIndex,
  dissociation,
  weeklySummary,
  fatigue,
  isDeloadWeek,
  nextWorkout,
  mesocycle,
  missions,
  phaseLabel,
  phaseWeek,
  cycleLength,
}: DashboardTabsProps) {

  return (
    <div className="flex flex-col gap-6 tab-fade-in max-w-[600px] mx-auto pb-10">
      
      {/* ── TOP HEADER BAR ── */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold tracking-[0.2em] text-[var(--text-faint)] uppercase">
          Lifts
        </span>
        <Link href="/profile">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden transition-transform active:scale-95"
            style={{
              border: '1.5px solid var(--accent-line)',
              background: 'var(--accent-soft)',
              boxShadow: '0 0 10px rgba(247, 37, 133, 0.15)'
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-semibold text-xs" style={{ color: 'var(--accent)' }}>
                {initial}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* ── PREMIUM HERO CARD ── */}
      <div
        className="glass p-5 rounded-2xl flex flex-col gap-5 relative overflow-hidden"
        style={{
          borderColor: 'var(--accent-line)',
          background: 'linear-gradient(145deg, rgba(247,37,133,0.07) 0%, rgba(247,37,133,0.02) 100%)',
        }}
      >
        {/* Top greeting + Active Phase Badge */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-semibold tracking-wider text-[var(--text-faint)] uppercase">
              {dateLabel}
            </span>
            <h1 className="text-base font-semibold text-[var(--text-hi)] mt-0.5">
              {greeting}, <span className="font-bold">{firstName}</span>
            </h1>
          </div>
          {profile?.training_phase && (
            <span
              className="inline-flex items-center h-6 px-3 rounded-full text-[9px] font-bold tracking-widest uppercase"
              style={{
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                border: '1px solid var(--accent-line)',
              }}
            >
              {profile.training_phase.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {/* Dual progress rings side-by-side */}
        <div className="flex items-center justify-center gap-6 py-2">
          <WeeklyRing done={weeklySummary.thisWeekCount} goal={weeklyGoalSessions} />
          <FatigueRing assessment={fatigue} />
        </div>

        {/* Streak & Mesocycle Phase Pills */}
        <div className="flex items-center justify-center gap-2.5 flex-wrap">
          {streak.currentStreak > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: 'var(--accent-soft)',
                border: '1.5px solid var(--accent-line)',
              }}
            >
              <Flame className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--accent)' }}
              >
                {streak.currentStreak} week streak
              </span>
            </div>
          )}
          {phaseWeek && cycleLength && (
            <div
              className="px-3 py-1.5 rounded-full bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.06)]"
            >
              <span
                className="mono text-[10px] tabular-nums font-semibold tracking-wider text-[var(--text-low)]"
              >
                Week {Math.min(phaseWeek, cycleLength)}/{cycleLength}
              </span>
            </div>
          )}
        </div>

        {/* Pulsing Start Workout CTA inside Hero Card */}
        <Link href="/routines" className="block mt-1">
          <div className="pulse-glow-btn w-full bg-[var(--accent)] hover:bg-[var(--accent-hi)] active:scale-[0.98] transition-all duration-150 p-3.5 rounded-xl flex items-center justify-center gap-2 text-white font-bold tracking-widest text-xs uppercase shadow-lg border border-[rgba(255,255,255,0.1)]">
            <Dumbbell className="w-4 h-4 text-white" />
            <span>Start Workout</span>
          </div>
        </Link>
      </div>

      {/* ── ACTIVE WARNINGS & ALERTS ── */}
      {(fatigue.shouldSuggest || dissociation.hasDissociation || (phaseWeek && cycleLength && phaseWeek > cycleLength)) && (
        <div className="space-y-3">
          {fatigue.shouldSuggest && <DeloadCard assessment={fatigue} />}
          <HypertrophicDissociationCard dissociation={dissociation} />
          <PhaseTransitionCard
            experienceLevel={profile?.experience_level ?? null}
            trainingPhase={profile?.training_phase ?? null}
            phaseStartedAt={profile?.phase_started_at ?? null}
          />
        </div>
      )}

      {/* ── SUGGESTED ROUTINE ── */}
      {nextWorkout && (
        <div className="glass border border-[var(--accent-line)] p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--accent)] to-[var(--cyan)]" />
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--accent)]">
                  Suggested Routine
                </span>
              </div>
              <h4 className="text-sm font-semibold text-[var(--text-hi)] pt-1">
                {nextWorkout.focus} suggestion
              </h4>
              <p className="text-xs text-[var(--text-low)] leading-relaxed">
                {nextWorkout.reason}
              </p>
            </div>
            <Link
              href={`/routines?start=${nextWorkout.focus || ''}`}
              className="text-[9px] font-bold tracking-widest uppercase py-1.5 px-3 rounded-md bg-[rgba(247,37,133,0.1)] border border-[rgba(247,37,133,0.2)] text-[var(--accent)] hover:bg-[rgba(247,37,133,0.15)] transition-colors active:scale-95"
            >
              Start
            </Link>
          </div>
        </div>
      )}

      {/* ── MISSIONS & WEEK CHECKLIST ── */}
      <ThisWeekCard
        thisWeekCount={weeklySummary.thisWeekCount}
        goalSessions={weeklyGoalSessions}
        weeklySummary={weeklySummary}
        missions={missions}
        nextWorkout={nextWorkout}
        isDeloadWeek={isDeloadWeek}
      />

      {/* ── COACHING SCIENCE VERTICAL STACK ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Compass className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-hi)]">
            Coaching &amp; Analytics
          </h3>
        </div>
        <PhaseCoachCard
          trainingPhase={profile?.training_phase ?? null}
          experienceLevel={profile?.experience_level ?? null}
          weeksInPhase={phaseWeek}
          strengthIndex={strengthIndex}
          volumeLandmarks={volumeLandmarks}
          mostImproved={mostImproved}
          mesocycle={mesocycle}
          profile={profile}
          bwHistory={bwHistory}
          weeklyGoal={weeklyGoalSessions}
        />
      </div>

      {/* ── CONSISTENCY & MOMENTUM CAROUSEL ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--text-hi)]">
            Consistency &amp; PRs
          </h3>
        </div>
        <MomentumStrip
          prs={recentPRs}
          streak={streak}
          badges={badges}
          totalVolume={totalVolume}
        />
      </div>

      {/* ── SCALE CHECK ── */}
      <div className="glass border border-[var(--accent-line)] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-[var(--accent)]" />
            <h3 className="t-label">Scale Check</h3>
          </div>
          <Link
            href="/progress"
            className="text-[9px] font-medium tracking-widest uppercase opacity-75 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--accent)' }}
          >
            Trends →
          </Link>
        </div>
        <BodyweightLogger latestWeight={latestBodyweight?.weight_kg ?? null} />
      </div>

      {/* ── RECENT HISTORY ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="t-label">Recent History</h3>
          <span className="text-[9px] text-[var(--text-faint)] uppercase tracking-wider">
            {totalWorkouts} sessions total
          </span>
        </div>
        <WorkoutHistoryList workouts={recentWorkouts.slice(0, 3)} />
      </div>

    </div>
  )
}

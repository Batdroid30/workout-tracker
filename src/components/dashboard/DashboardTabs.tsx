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
import { Chip, getButtonClassName } from '@/components/ui'
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
import { DailyReadinessCard } from './DailyReadinessCard'
import { CoachBriefingCard } from './CoachBriefingCard'

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
  todayReadiness: any
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
  todayReadiness,
}: DashboardTabsProps) {

  return (
    <div className="flex flex-col gap-6 tab-fade-in max-w-[600px] mx-auto pb-10">
      
      {/* ── TOP HEADER BAR ── */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-tertiary">
          Lifts
        </span>
        <Link href="/profile">
          <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden transition-transform active:scale-95 border border-border-strong bg-surface-raised">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-semibold text-xs text-primary">
                {initial}
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* ── PREMIUM HERO CARD ── */}
      <div className="card border-border-strong p-5 flex flex-col gap-5 relative overflow-hidden">
        {/* Top greeting + Active Phase Badge */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-tertiary">
              {dateLabel}
            </span>
            <h1 className="text-base font-semibold text-primary mt-0.5">
              {greeting}, <span className="font-bold">{firstName}</span>
            </h1>
          </div>
          {profile?.training_phase && (
            <Chip>{profile.training_phase.replace(/_/g, ' ')}</Chip>
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
            <Chip icon={<Flame className="w-3.5 h-3.5" />}>
              {streak.currentStreak} week streak
            </Chip>
          )}
          {phaseWeek && cycleLength && (
            <Chip>
              <span className="mono tabular-nums">
                Week {Math.min(phaseWeek, cycleLength)}/{cycleLength}
              </span>
            </Chip>
          )}
        </div>

        <Link href="/routines" className={cn(getButtonClassName({}), 'mt-1')}>
          <Dumbbell className="w-4 h-4" />
          Start workout
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

      {/* ── AI COACH BRIEFING CARD ── */}
      <CoachBriefingCard
        stalledMovements={stalledMovements}
        fatigue={fatigue}
        neglectedMuscles={neglectedMuscles}
        streak={streak}
        profile={profile}
      />

      {/* ── DAILY READINESS ── */}
      <DailyReadinessCard todayReadiness={todayReadiness} />

      {/* ── SUGGESTED ROUTINE ── */}
      {nextWorkout && (
        <div className="card border border-border-strong p-4 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-primary">
                  Suggested routine
                </span>
              </div>
              <h4 className="text-sm font-semibold text-primary pt-1">
                {nextWorkout.focus} suggestion
              </h4>
              <p className="text-xs text-tertiary leading-relaxed">
                {nextWorkout.reason}
              </p>
            </div>
            <Link
              href={`/routines?start=${nextWorkout.focus || ''}`}
              className={cn(getButtonClassName({ variant: 'secondary', size: 'sm', fullWidth: false }), 'shrink-0')}
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
          <Compass className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold text-primary">
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
          <Flame className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold text-primary">
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
      <div className="card border border-border-strong p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5 text-primary" />
            <h3 className="t-label">Scale check</h3>
          </div>
          <Link
            href="/progress"
            className="text-xs font-medium text-primary opacity-75 hover:opacity-100 transition-opacity"
          >
            Trends →
          </Link>
        </div>
        <BodyweightLogger latestWeight={latestBodyweight?.weight_kg ?? null} />
      </div>

      {/* ── RECENT HISTORY ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="t-label">Recent history</h3>
          <span className="text-xs text-tertiary">
            {totalWorkouts} sessions total
          </span>
        </div>
        <WorkoutHistoryList workouts={recentWorkouts.slice(0, 3)} />
      </div>

    </div>
  )
}

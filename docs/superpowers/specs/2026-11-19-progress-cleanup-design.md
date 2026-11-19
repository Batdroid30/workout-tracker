# Workout Map, Progress Cleanup, Compact Readiness — Design

Date: 2026-11-19 · Status: approved (cut list approved by user)
Builds on: `2026-11-19-body-map-design.md`

## Intent

The user wants the body map where they look first, a Progress page with less scrolling and
no repeated information, and a dashboard readiness card that takes less room.

## Goals

1. **Workout detail page** (`/workout/[id]`): a larger interactive session body map just under
   the title/date card and above the Duration/Volume tiles. Tapping a muscle shows
   "Chest · 4 sets", with sets counted by the shared half-set rule (`addSetToMuscleCounts`)
   and warm-ups excluded.
2. **Progress page**: Muscle Focus moves to the top, directly under the page header.
3. **Progress page**: remove duplicates (approved list):
   - Top Personal Records table
   - PRs per Month chart
   - Weekly Sets by Category chart
   - Push/Pull/Legs card
   - Month over Month card
   - Deload Readiness card
   - Total Volume Lifted banner (its number moves into the overview stats row)

   Also merge Bodyweight and Body Composition under one "Bodyweight" heading. Resulting
   order: Muscle Focus → Phase Coach → Consistency → Strength (key lifts, stalled lifts,
   PR timeline) → Volume Trend + RPE/volume-per-session charts → Antagonist Balance →
   Bodyweight → Exercise detail link.
4. **Dashboard readiness card**: compact layout.
   - Logging: one row per metric (icon + label + five small score buttons), title
     "How do you feel today?" and Save in the header. About a third of today's height.
   - Once logged: a single line, `Readiness · Sleep 4 · Recovery 3 · Energy 5`.
   - Saving behaviour is unchanged (`logReadinessAction`).

5. **Database speed** (user asked for efficiency and scalability):
   - Add indexes on `workout_exercises.workout_id`, `sets.workout_exercise_id` and
     `workouts(user_id, started_at desc)`. These are the join keys every history, workout and
     progress query uses; the Supabase advisor flags the first two as unindexed.
   - Page the profile history: 20 workouts at a time with a "Load more" button, instead of up
     to 200 at once. PR badges are looked up only for the sets on the page.
   - Make the Progress snapshot query cheaper: filter its 12-week window on the indexed
     `workouts.started_at` and select only the columns it uses. Measure before and after.
     Caching is ruled out: `unstable_cache` was dropped earlier after stale-data bugs.

## Non-goals

- Changing the readiness data model, the fatigue ring or the coach.
- Deleting components used elsewhere. Components left unused by the Progress cuts are
  deleted only if nothing else imports them (CLAUDE.md orphan rule).
- Changing the abductors mapping (separate open question).

## Constraints

- 375px width must work. Follow AGENTS.md: no `any`, no `as` in new code, one component per file.
- The workout page's data query (`getWorkoutById`) must add `secondary_muscles` to the exercise select.
- Queries that only fed removed sections (e.g. the `StrengthPRLoader` PR-per-month data and the
  `TopPRsLoader`) are removed with them. Keep a query if something still uses it (the PR
  timeline uses `getPersonalRecordsData`).

## Approaches

One sensible way for each part: reuse the existing `BodyMap` (interactive mode) plus the
session-intensity helpers for the workout page; reorder and remove JSX in the Progress page;
restyle the existing `DailyReadinessCard`. Alternatives (a new page layout system, a modal
readiness logger) add complexity for no user benefit.

## Left to the builder

The workout map's exact size and caption styling, the score button size (keep ≥ 32px tap
targets), and the wording of the empty "no muscles" state on the workout page.

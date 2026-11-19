# Workout Map, Progress Cleanup, Compact Readiness — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an interactive session body map to the top of the workout page. Move the weekly map to the top of Progress and remove its duplicate sections. Shrink the dashboard readiness card. Cut database load with indexes, a paged profile history and a cheaper Progress query.

**Architecture:** Reuse the existing `BodyMap` (interactive mode) and the `lib/body-map` helpers. A new pure helper exposes raw per-session set counts, and the existing intensity function is rebuilt on top of it. The Progress changes are JSX removal and reordering in `progress/page.tsx`, plus deleting components that become unused. The readiness card is a restyle of `DailyReadinessCard`, with its behaviour unchanged.

**Tech Stack:** Next 16 / React 19, TypeScript, Tailwind, Supabase, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-19-progress-cleanup-design.md`

## Global Constraints

- 375px width must work.
- No `any`, no `as` casts in new code; one component per file; `lib/` stays React-free.
- Set counting uses the shared rule (`addSetToMuscleCounts`): primary 1, each secondary 0.5. Working sets are `!is_warmup && reps > 0`.
- Set counts display with `formatSetCount` (≤1 decimal); "1 set" vs "n sets".
- Delete a component only if nothing else imports it (verify with grep).
- Tap targets ≥ 32px.
- Commits: conventional format, imperative, ≤72 chars, no co-author trailers.

## Review Focus

1. **Workout with only warm-ups, or no sets.** The workout map shows a neutral body plus a short caption. No NaN, no crash. Test in Task 1.
2. **Exercise with null `secondary_muscles` or an unknown muscle string.** It is skipped silently. Test in Task 1.
3. **Readiness already logged today.** The card renders only the single summary line, with no buttons. Checked in Task 4, Step 3.
4. **Progress page with no data yet (new user).** It still renders with no errors after the sections are removed. Checked in Task 3, Step 4.
5. **Shared upper-back region on the workout map** (back + lats). The label shows the muscle with more sets. Test in Task 1.

---

### Task 0: Index the workout join keys (database, controller-run)

Run once against the `workout-tracker` Supabase project, after user approval. No app code changes. The Supabase performance advisor flags these foreign keys as unindexed. Every history, workout-page and progress query joins `workouts → workout_exercises → sets` through them.

- [ ] **Step 1:** Apply this migration (`add_workout_join_indexes`):

```sql
create index if not exists idx_workout_exercises_workout_id on public.workout_exercises (workout_id);
create index if not exists idx_sets_workout_exercise_id    on public.sets (workout_exercise_id);
create index if not exists idx_workouts_user_started_at    on public.workouts (user_id, started_at desc);
```

- [ ] **Step 2:** Verify with `select indexname from pg_indexes where indexname like 'idx_%'`: the three names are present. Re-run the performance advisor: the two `unindexed_foreign_keys` findings for `sets` and `workout_exercises` are gone.

---

### Task 1: Raw session set counts

**Files:**
- Modify: `src/lib/body-map/session-intensity.ts`, `src/lib/body-map/index.ts`
- Test: `src/lib/body-map/session-intensity.test.ts`

**Interfaces:**
- Produces: `calculateSessionSets(exercises: SessionExerciseInput[]): Partial<Record<MuscleGroup, number>>`. This returns the raw half-set counts per known muscle group, with zero-score muscles omitted. `calculateSessionIntensity` is reimplemented as `calculateSessionSets` normalised by its max, and its existing tests must keep passing.

- [ ] **Step 1: Write failing tests** in `session-intensity.test.ts`:

```ts
it('calculateSessionSets returns raw half-set counts', () => {
  expect(calculateSessionSets([
    { muscleGroup: 'chest', secondaryMuscles: ['triceps'], workingSetCount: 4 },
    { muscleGroup: 'triceps', secondaryMuscles: null, workingSetCount: 3 },
  ])).toEqual({ chest: 4, triceps: 5 })
})
it('calculateSessionSets is empty for warm-up-only or empty sessions', () => {
  expect(calculateSessionSets([{ muscleGroup: 'chest', secondaryMuscles: [], workingSetCount: 0 }])).toEqual({})
  expect(calculateSessionSets([])).toEqual({})
})
it('calculateSessionSets skips null and unknown muscles', () => {
  expect(calculateSessionSets([{ muscleGroup: null, secondaryMuscles: ['neck'], workingSetCount: 2 }])).toEqual({})
})
it('upper-back takes the larger of back and lats', () => {
  const sets = calculateSessionSets([
    { muscleGroup: 'lats', secondaryMuscles: null, workingSetCount: 2 },
    { muscleGroup: 'back', secondaryMuscles: null, workingSetCount: 5 },
  ])
  expect(toRegionValues(sets, Math.max)['upper-back']).toBe(5)
})
```

- [ ] **Step 2:** `npx vitest run src/lib/body-map/session-intensity.test.ts` → FAIL (`calculateSessionSets` not exported).
- [ ] **Step 3:** Implement and export it. Rebuild `calculateSessionIntensity` on top of it, and re-export from `index.ts`. Guard `workingSetCount` with `!(n > 0)` so NaN is skipped.
- [ ] **Step 4:** Same command, then `npx vitest run` → all PASS.
- [ ] **Step 5: Commit**: `feat(body-map): expose raw per-session muscle set counts`

---

### Task 2: Body map at the top of the workout page

**Files:**
- Modify: `src/lib/data/workouts.ts` (`getWorkoutById` select, ~L218: add `secondary_muscles` to `exercise:exercises ( … )`)
- Create: `src/components/workout/WorkoutBodyMapCard.tsx` (`'use client'`)
- Modify: `src/app/(app)/workout/[id]/page.tsx` (insert between the meta card and the stat-tile grid, ~L95)

**Interfaces:**
- Consumes:
  - `calculateSessionSets`, `toRegionValues`, `toHeatLevel`, `REGION_LABELS`, `SessionExerciseInput`, `BodyRegion` from `@/lib/body-map`
  - `BodyMap` from `@/components/ui/BodyMap` (interactive mode: pass `onRegionClick`; no `BodyMapDefs` needed)
  - `readSecondaryMuscles` and `formatSetCount` from `@/lib/muscle-sets`
- Produces: `export function WorkoutBodyMapCard({ exercises }: { exercises: SessionExerciseInput[] })`

- [ ] **Step 1:** Add `secondary_muscles` to the `getWorkoutById` exercise select. Verify: `npx tsc --noEmit` is clean (ignore `.next/`).
- [ ] **Step 2: Implement `WorkoutBodyMapCard`.**
  - Fills: every trained region is `var(--accent)`, with opacity `toHeatLevel(regionSets / maxSets)`.
  - Tapping a region shows `"{Muscle} · {formatSetCount(n)} set(s)"`. For a shared region, show the muscle with more sets, using the same `pickStronger` idea as `WeeklyBodyMapCard`.
  - Default caption: "Tap a muscle for details."
  - With no working sets: neutral body plus "No working sets in this workout."
  - Wrapper: `glass p-4`, label "Muscles worked", map height about `h-[220px]`.
- [ ] **Step 3: Wire it into the page.** Map `workout.workout_exercises` to `SessionExerciseInput`:
  - `muscleGroup`: `we.exercise.muscle_group`
  - `secondaryMuscles`: `readSecondaryMuscles(we.exercise.secondary_muscles)`
  - `workingSetCount`: the number of sets with `!is_warmup && reps > 0`

  Do the mapping in a small pure function in the same page file, or in `src/lib/body-map` if `WorkoutHistoryList`'s `toSessionExercises` can be shared. Prefer sharing: move `toSessionExercises` into `src/lib/body-map/session-exercises.ts` and use it in both places.
- [ ] **Step 4: Verify.** `npx tsc --noEmit`, `npx eslint` on the changed files, `npx vitest run`.
- [ ] **Step 5: Commit**: `feat(workout): show session body map at top of workout page`

---

### Task 3: Progress page: map first, duplicates removed

**Files:**
- Modify: `src/app/(app)/progress/page.tsx`
- Modify: `src/components/progress/OverviewStatsRow.tsx` (add the lifetime volume cell)
- Delete if unused after the change: `src/components/profile/TopPRsTable.tsx`, `src/components/progress/PRVelocityChart.tsx`, `src/components/progress/MuscleVolumeTrendChart.tsx`, `src/components/progress/PushPullLegsCard.tsx`, `src/components/progress/MonthOverMonthCard.tsx`, `src/components/progress/DeloadReadinessCard.tsx`

**Interfaces:**
- Produces: `OverviewStatsRow` gains the prop `totalVolumeKg: number`, shown as a fourth cell labelled "Lifetime" using the page's existing `formattedVolume` formatting (move that formatter into the component or `@/lib/load`'s `formatVolume`. Prefer `formatVolume` if its output fits, e.g. "1.2M" is not supported, so add M handling only if `formatVolume` lacks it).

- [ ] **Step 1: Reorder.** The "Muscle Focus" section (with the "This Week" pill and `WeeklyBodyMapCard`) moves directly after the header block, before the stats row.
- [ ] **Step 2: Remove.**
  - The Total Volume Lifted banner (its value moves to `OverviewStatsRow`)
  - `TopPRsLoader` and its section
  - The PRs per Month block inside `StrengthPRLoader` (keep the PR Timeline)
  - The "Weekly Sets by Category" block
  - `PushPullLegsCard`
  - `MonthOverMonthCard`
  - `DeloadReadinessCard`

  The remaining Readiness charts (`ReadinessTrendCharts`) move into the Volume Trend section, under the line chart. Merge the Body Composition `<section>` under the Bodyweight block with a single "Bodyweight" heading, and keep `BodyweightSection` plus `BodyCompositionLoader` content. Remove any now-unused imports, variables and loaders (e.g. `PRTableSkeleton`, `antagonistSets` stays because `AntagonistBalanceCard` stays).
- [ ] **Step 3: Delete orphans.** For each listed component, `grep -rn "<Name>" src` and delete it if there are no remaining importers.
- [ ] **Step 4: Verify.**
  - `npx tsc --noEmit`, `npx eslint` on the changed files, `npx vitest run`.
  - Final order: Muscle Focus → stats row → Phase Coach → Consistency → Strength → Volume Trend (+ RPE charts) → Antagonist Balance → Bodyweight → Exercise detail.
  - Every server data call left in the page must still be used.
- [ ] **Step 5: Commit**:
  - `refactor(progress): lead with body map and drop duplicate sections`
  - a separate `chore(progress): remove unused progress components` if orphan deletions are large

---

### Task 4: Compact readiness card

**Files:**
- Modify: `src/components/dashboard/DailyReadinessCard.tsx`

**Interfaces:**
- Unchanged props (`todayReadiness`) and unchanged save call (`logReadinessAction({ sleep_score, soreness_score, energy_score })`).

- [ ] **Step 1: Logging state.**
  - Header row: "How do you feel today?" on the left; a small Save button on the right (disabled while pending, shows "Saving…").
  - Below it, three rows, each `icon + label (fixed ~80px) + five score buttons` in one line. Labels are Sleep, Recovery and Energy.
  - Buttons: ≥ 32px square, selected uses `var(--accent)`.
  - Drop the min/max caption rows. Card padding `p-4`, rows `space-y-2`.
- [ ] **Step 2: Logged state.** A single-line `glass` row: `Readiness · Sleep 4 · Recovery 3 · Energy 5`, keeping the sparkle icon when the average is ≥ 4.
- [ ] **Step 3: Verify.** `npx tsc --noEmit`, `npx eslint` on the file, `npx vitest run`. The controller checks both states visually at 375px.
- [ ] **Step 4: Commit**: `style(dashboard): compact daily readiness card`

---

### Task 5: Page the profile workout history ("Load more")

**Files:**
- Modify: `src/lib/data/workouts.ts`. Replace `getAllWorkouts` and `HISTORY_LIMIT` with a paged reader.
- Modify: `src/app/(app)/profile/actions.ts`. Add the load-more server action.
- Modify: `src/app/(app)/profile/page.tsx` (`HistoryTab`)
- Modify: `src/components/workout/WorkoutHistoryList.tsx`
- Test: `src/lib/data/history-page.test.ts` (pure helper only)

**Interfaces:**
- Produces:
  - `HISTORY_PAGE_SIZE = 20` (exported constant)
  - `getWorkoutHistoryPage(userId: string, offset: number, runAsAdmin?: boolean): Promise<{ workouts: WorkoutItem[]; hasMore: boolean }>`. It uses `.range(offset, offset + HISTORY_PAGE_SIZE)`, fetching one extra row to compute `hasMore` and returning at most `HISTORY_PAGE_SIZE` rows. It keeps the same nested select as today, and the selected workout columns are explicit instead of `*`: `id, title, started_at, duration_seconds, bodyweight_kg`.
  - The PR badge lookup is scoped to the page: fetch `personal_records` with `.in('set_id', pageSetIds)` instead of all of the user's PRs.
  - The pure helper `splitPage<T>(rows: T[], pageSize: number): { items: T[]; hasMore: boolean }` lives in `src/lib/data/history-page.ts`.
  - `loadMoreWorkoutsAction(offset: number): Promise<{ workouts: WorkoutItem[]; hasMore: boolean } | { error: string }>`. It does an auth check first and validates `offset` with Zod (`z.number().int().min(0)`).
  - `WorkoutHistoryList` gains the optional props `initialHasMore?: boolean` and `onLoadMore?: (offset: number) => Promise<…>`. Without them it behaves exactly as today (the dashboard keeps passing 3 workouts). `WorkoutItem` is exported for the action's return type.

- [ ] **Step 1: Write failing tests** for `splitPage`:

```ts
it('returns hasMore when there is an extra row', () => {
  expect(splitPage([1, 2, 3], 2)).toEqual({ items: [1, 2], hasMore: true })
})
it('returns hasMore false on the last page', () => {
  expect(splitPage([1, 2], 2)).toEqual({ items: [1, 2], hasMore: false })
  expect(splitPage([], 2)).toEqual({ items: [], hasMore: false })
})
```

- [ ] **Step 2:** `npx vitest run src/lib/data/history-page.test.ts` → FAIL; implement; → PASS.
- [ ] **Step 3:** Implement `getWorkoutHistoryPage` and the action. Delete `getAllWorkouts` if nothing else uses it (grep).
- [ ] **Step 4: Wire the UI.**
  - `HistoryTab` loads page 0 and passes `initialHasMore` plus the action.
  - The list appends results, deduplicating by `id`, and shows a full-width "Load more" button while `hasMore`. The button shows "Loading…" while pending, and a toast on error.
  - `BodyMapDefs` stays mounted once.
  - Remove the profile page's `as any` if the new types make it unnecessary.
- [ ] **Step 5: Verify.** `npx tsc --noEmit`, `npx eslint` on the changed files, `npx vitest run`. The controller checks in the browser that the first 20 cards render and "Load more" appends the next 20 (the account has 84+ workouts).
- [ ] **Step 6: Commit**: `perf(profile): page workout history with load more`

---

### Task 6: Make the Progress snapshot query cheaper

Caching is **not** an option: `unstable_cache` was deliberately dropped after stale-data bugs, and React `cache()` + `revalidatePath` is the chosen pattern. So the gain has to come from the query itself.

**Files:**
- Modify: `src/lib/data/progress-snapshot.ts` (the `getProgressSnapshot` query, ~L105-125)

**Interfaces:**
- Unchanged: the `ProgressSnapshot` return shape and all consumers.

- [ ] **Step 1: Measure first.** Using Supabase `execute_sql`, run `explain analyze` on the SQL the snapshot query generates, or an equivalent join (`sets` ⋈ `workout_exercises` ⋈ `workouts` filtered by user + 12-week window). Record the plan and timing in the report.
- [ ] **Step 2: Narrow the date filter.** Filter the 12-week window on the joined `workouts.started_at` (`.gte('workout_exercises.workouts.started_at', since)`), not `sets.completed_at`, so Postgres can use `idx_workouts_user_started_at` (Task 0). Check that results stay identical: week bucketing already uses `started_at`.
- [ ] **Step 3: Trim columns.** Select only the fields the loop reads, and drop any that are unused (verify each by grep within the file).
- [ ] **Step 4: Measure again.** Use the same `explain analyze`. Report before/after timing and whether the new index is used. If there's no improvement, revert Step 2 and say so.
- [ ] **Step 5: Verify.** `npx vitest run`, `npx tsc --noEmit`. The controller checks that the Progress page shows the same numbers as before (Phase Coach set counts, Volume Trend).
- [ ] **Step 6: Commit**: `perf(progress): use indexed date filter in progress snapshot`

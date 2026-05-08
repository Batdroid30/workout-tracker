# 🏋️ Lifts — Workout Tracker

> **Internal Documentation & System Manual**  
> For the engineering team: understand, maintain, and evolve the **Lifts** platform.

---

## 0. The Prime Directive
**Write code for the next developer, not the compiler.**  
This project follows strict SOLID principles. Every decision — from the repository pattern to the revalidation strategy — is optimised for **clarity and maintainability** over cleverness. See `AGENTS.md` for the full coding standards.

---

## 1. Feature Inventory

### ✅ Shipped
- **Zero-friction logging** — Zustand-backed active workout store, persisted to localStorage. Survives page refreshes and app kills mid-session.
- **DUP (Daily Undulating Periodization)** — Automatic 3-week cycling between Strength / Hypertrophy / Volume weeks. Rep ranges, RPE targets, and weight suggestions all update coherently with the current week. No user configuration required.
- **Progressive overload suggestions** — Per-set suggestions driven by last session's weight/reps/RPE. RPE input pre-fills with the DUP week's target so it's always logged even if the user doesn't touch it.
- **Superset support** — Pair any two exercises via the ⋮ menu. Grouped under a `SupersetWrapper` with a visual accent rail. Rest timer fires only after the last exercise in the pair. Persisted to DB with a shared `superset_group` UUID.
- **Focus sheet on session start** — "What are you targeting?" sheet on blank workout start. Selects exercises by muscle group and auto-generates a template with phase-appropriate sets and reps.
- **PR detection** — Local Zustand cache checked optimistically on set completion. Server-side `check_and_update_prs` RPC confirms asynchronously. PR banner fires in-session.
- **Fatigue coach** — Heuristic fatigue assessment (`assessFatigueLevel`) drives deload suggestions. Deload depth (low/medium/high confidence) controls intensity factor (75% / 65% / 55%) and set count.
- **Deload routine generator** — `generateDeloadRoutine` produces a one-week prescription from recent loads. Weights rounded to nearest 2.5 kg plate.
- **Routine templates** — Save and reuse workout structures. Routine workouts use a collapsible accordion UI (one exercise expanded at a time). Modified routines prompt to sync the template on finish.
- **Workout history** — Full log with per-set detail, duration, and volume. Copy any past workout to use as today's template.
- **Import system** — Hevy/CSV data ingestion with fuzzy exercise matching.

### 🚧 Known gaps / next priorities
- PWA / offline-first service worker
- Plate calculator accessible from history view
- Per-muscle volume heatmap on the dashboard

---

## 2. Architecture

### 2.1 Repository pattern (`src/lib/data/`)
Never call Supabase from a UI component or page.
- All reads: functions in `src/lib/data/` (cached with React `cache()` for request-level deduplication).
- All writes: Server Actions → call the same data functions.
- After any mutation, call `revalidateAll()` → `revalidatePath('/', 'layout')`. One call, guaranteed freshness, zero tag management.

### 2.2 Active workout state (`src/store/workout.store.ts`)
The in-progress workout lives entirely in Zustand, persisted to localStorage under the `active-workout` key. Key actions:

| Action | Effect |
|---|---|
| `startWorkout` | blank session |
| `startFromTemplate` | session from `ActiveExercise[]` (focus sheet or copy) |
| `startRoutine` | session from a saved routine |
| `pairAsSuperset(a, b)` | assigns shared UUID, moves `b` adjacent to `a` |
| `unpairSuperset(i)` | clears `superset_group` from the whole group |
| `finishWorkout` | clears store (called after server save succeeds) |

### 2.3 DUP scheme (`src/lib/workout-intelligence.ts`)
`getCurrentDUPScheme()` returns `{ label, repRange, rpeTarget }` based on `(weeksSinceEpoch % 3)`. Every surface that shows rep targets or RPE — the workout header pill, `suggestNextSet`, the focus sheet template generator, phase-coach missions — calls this function so they always agree.

### 2.4 Algorithm layer (`src/lib/algorithms.ts`)
Pure functions. No DB, no async. Fully unit-tested in `algorithms.test.ts`.

| Function | Purpose |
|---|---|
| `calculateEpley1RM` | Epley formula for estimated 1RM |
| `suggestNextSet` | Double-progression suggestion with RPE calibration. Returns `{ weight_kg, target_reps, rpe_target, reason }` |
| `assessFatigueLevel` | Signal-based fatigue assessment from weekly summaries |
| `generateDeloadRoutine` | One-week deload prescription (intensity: 75% / 65% / 55% by confidence) |

### 2.5 Superset rendering (`src/app/(app)/workout/page.tsx`)
The `renderExercises` helper pre-scans all exercises into a `groupMembers` map before rendering, so a shared `superset_group` always produces exactly one `SupersetWrapper` regardless of whether the paired exercises are adjacent in the array. Exercises are moved adjacent in the store on pairing, but the renderer is defensive against legacy localStorage state.

---

## 3. Workspace Map

| Path | What it is |
|---|---|
| `src/app/(app)/workout/page.tsx` | Active workout UI — exercise rendering, superset grouping, finish flow |
| `src/app/(app)/routines/` | Routine list, detail, and start-routine flow |
| `src/lib/data/` | All Supabase queries — one file per domain |
| `src/lib/algorithms.ts` | Pure coaching algorithms — suggest, deload, fatigue, 1RM |
| `src/lib/workout-intelligence.ts` | DUP scheme, rep ranges, RPE targets, exercise frequency |
| `src/lib/template-generator.ts` | Converts `Exercise[]` + phase → `ActiveExercise[]` with DUP-appropriate sets |
| `src/store/workout.store.ts` | Zustand active workout store (localStorage-persisted) |
| `src/store/pr.store.ts` | Local PR cache for optimistic PR detection |
| `src/components/workout/` | SetLogger, SetRow, SupersetWrapper, WorkoutFocusSheet, RestTimer, etc. |
| `src/lib/cache.ts` | `revalidateAll()` helper |
| `supabase/migrations/` | All DB migrations — run with `npx supabase db push` |

---

## 4. Setup

```bash
# Install
npm install

# Dev server
npm run dev

# Type-check
npx tsc --noEmit

# Unit tests
npx vitest run

# Apply pending DB migrations
npx supabase db push
```

### Environment variables (`.env.local`)
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # admin operations (PR checks, imports)
AUTH_SECRET=...                  # NextAuth session signing
```

### Database
- RLS enabled on all tables. Policies scope every row to `auth.uid()`.
- Use `getSupabaseAdmin()` only in Server Actions and background jobs — never in client components.
- New DB changes: create a migration in `supabase/migrations/` and run `npx supabase db push`.

---

## 5. Gotchas

1. **Zustand hydration** — The active workout store rehydrates from localStorage after the first render. Components that branch on `activeWorkout` are already client components; no extra `mounted` flag needed since the persist middleware handles it.
2. **DUP scheme must be consistent** — If you add a new surface that displays rep targets, call `getCurrentDUPScheme()` rather than hardcoding. The week label, suggestion text, and template reps must always match.
3. **Superset group UUID** — Assigned on the client with `crypto.randomUUID()` and written to `workout_exercises.superset_group` on save. The column is `uuid DEFAULT NULL` — standalone exercises store `NULL`.
4. **`rpe_target` in suggestions** — `suggestNextSet` now returns `rpe_target` in every code path. `SetRow` uses this to pre-fill the RPE input on mount and commit it to the store, so RPE is always logged even if the user doesn't touch the field.

---

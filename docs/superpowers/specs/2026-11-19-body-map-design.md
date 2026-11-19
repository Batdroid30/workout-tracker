# Muscle Body Map — Design

Date: 2026-11-19 · Status: approved
Plan: `docs/superpowers/plans/2026-11-19-body-map.md` — run with subagent-driven execution.

## Intent

Show at a glance which muscles were trained and how much, as a front/back body map.
The weekly map on the Progress page answers "am I in the right volume range for each
muscle this week?". The map on each workout history card answers "what did this session hit?".

## Goals

1. Weekly body map on the Progress page, coloured by Phase Coach volume status. It replaces the Muscle Focus radar.
2. A per-session heat map on every workout history card. These cards appear on the dashboard's recent list and the profile history tab.
3. Old bodyweight sets saved at 0 kg are corrected so they count toward volume and muscle counts.

## Non-goals

- A map on the workout detail page or during an active workout (possible follow-up).
- Changing the push/pull/legs or antagonist balance numbers. These stay primary-only.
- Finer anatomy than the app's 13 muscle groups.

## Anti-goals

- A copy of another app's artwork.
- A history list that gets noticeably heavier. The profile history renders up to 200 cards.
- The weekly map disagreeing with Phase Coach for the same muscle.

## Approaches considered

| Approach | Trade-off |
|---|---|
| **A. Own `BodyMap` with MIT path data vendored from `react-body-highlighter` v2.0.5** (chosen) | No dependency; full control of theming, sizing and payload. Needs a licence header. |
| B. `react-body-highlighter` as a package | Fast start, but unmaintained since 2022, fixed colour model, and the full SVG is inlined per instance. |
| C. Hand-drawn figure | Total control, but slow and risky to get looking right. |

## Decisions

### Weekly map (Progress page): user's call, made in the forked session
- Each muscle is coloured by its Phase Coach volume status, using the colours from
  `VOLUME_STATUS_STYLES`: red for below MV, orange for maintenance, yellow for sub-optimal,
  green for optimal, orange for high and red for over MRV.
- Untrained muscles get the neutral fill, never a status colour. A week with no training
  shows a neutral body and a caption.
- The status styles move into a shared module with a `fill` value per status.
- Tapping a muscle shows "Muscle · n sets · status". The legend lists only the statuses present.
- Reads the same `volumeLandmarks` that Phase Coach uses, so the two always agree.

### Session map (history cards): user's call
- One accent colour with 4 opacity steps.
- The primary muscle gets 1 per working set and each secondary gets 0.5. Warm-ups are excluded.
- Values are normalised to the session's most-trained muscle.

### Shared regions: forked session's call
- `back` and `lats` share the upper-back region, which shows whichever value is stronger.
  `quads` also lights the adductors; `glutes` also lights the abductors.

### Bodyweight backfill: user approved 2026-11-19
- 15 working sets on bodyweight-equipment exercises were saved at 0 kg before early June 2026
  (Pull Up ×7, Chin Up (Weighted) ×5, Chest Dip ×3).
- Set them to the workout's `bodyweight_kg`, or 75 kg where none is stored.
- Re-count before running; it must be 15 rows. The 5 stray 0 kg barbell, machine and cable sets stay as they are.
- No code change is needed. New bodyweight sets already save bodyweight as weight (`SetRow.tsx:53`).

### Card payload: Claude's call
- Each figure's path data ships once per page as an SVG `<symbol>`.
- Each card's map uses `<use>` with region fills passed as CSS variables, which keeps 200 history cards light.

### Secondary muscles in weekly per-muscle counts: user's call, 2026-11-19
- Weekly per-muscle counts (`currentWeekSetsByMuscle`) half-count secondaries, using the same
  rule as the session map. These counts drive Phase Coach and the weekly map.
- The rule lives in one shared helper (`src/lib/muscle-sets.ts`), which the coach chat also uses,
  so every surface agrees.
- Expected effect: muscles hit mainly as secondaries (triceps, front delts, biceps) move up the
  volume-status scale. Set counts can be fractional (e.g. 7.5).
- Push/pull/legs and antagonist totals stay primary-only.

## Verification

Each plan task lists its own checks. Overall:
- `tsc`, lint, Vitest and `npm run build` all pass.
- Checked at 375px in light and dark.
- The weekly map's colours match the Phase Coach bars.
- After the backfill, the affected May weeks' volume rises and the 0 kg count is 0.

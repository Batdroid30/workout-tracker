# Lifts design system — handbook

How Lifts should look and read. The code is the source of truth: values live in `src/styles/tokens.css`, type and card styles in `src/app/globals.css`, components in `src/components/ui/`, and `eslint.config.mjs` enforces the rules. If this handbook and the code ever disagree, the code wins — then fix the handbook.

Lifts is a mobile-first strength tracker: *a quieter strength for the long game.* Calm and readable: near-black **Ink** surfaces, solid cards, large plain type, and a single **Lime** accent that only ever means "act here" or "you did it". Each screen shows the information that matters, nothing just because it exists.

---

## Writing

- **Voice: a coach who keeps it short.** Direct, encouraging, never hype-y. Speak to the lifter as "you"; the app says "I" only in the AI Coach chat.
  - "Your body is likely due for a deload this week."
  - "Your data suggests a lighter week could help."
- **Sentence case everywhere** — buttons, labels, chips, nav, titles: "Start workout", "This week", "Save readiness". No ALL-CAPS, no letter-spacing. Abbreviations stay as they are (RPE, 1RM, MEV/MAV/MRV, PR, kg). Exercise names keep their own case ("Bench Press").
- **Numbers are the content.** Weights, reps, volume and sets use Geist Mono with tabular numerals. Units follow in a smaller `text-secondary` span: `102.5 kg`, `3 × 8`.
- **Celebrate briefly.** A PR gets one short line ("New record") in a banner that dismisses itself — never a modal.
- **No emoji in the UI.** Icons do that job.
- **Errors say what failed and what happens next:** "Failed to save set. Will retry when connected."

---

## Colour

Tailwind utilities in brackets.

### Surfaces and lines

| Token | Value | Use |
|---|---|---|
| `bg` | `#0b0d10` | Page background (`bg-bg`) |
| `surface` | `#15181d` | Cards (`bg-surface`, `.card`) |
| `surface-raised` | `#1d2128` | Inputs, steppers, nested tiles, sheets, menus, secondary buttons, unselected chips |
| `border` | `#232830` | Card and divider hairlines |
| `border-strong` | `#2a3039` | Input borders, secondary/outline button borders |

### Text

| Token | Value | Use |
|---|---|---|
| `text-primary` | `#f3f5f7` | Headings, values, primary text (≥15:1). Also the fill of selected chips (`bg-primary`) |
| `text-secondary` | `#9aa3ae` | Body copy, labels, meta (~7:1) |
| `text-tertiary` | `#828b96` | Placeholders, disabled text, de-emphasised meta, inactive nav (≥4.5:1 on surfaces). Never on a `*-soft` tint |

### Accent — lime

| Token | Value | Use |
|---|---|---|
| `lime` | `#c5f04a` | `bg-accent` / `text-accent` |
| `lime-pressed` | `#b3dc38` | Pressed primary button |
| `on-accent` | `#0b0d10` | Text and icons on lime |
| `lime-soft` | `rgba(197,240,74,0.12)` | `bg-accent-soft`, behind lime text on PR/achievement chips |

**Lime is rare on purpose.** Only on:
1. the primary button fill — one per screen,
2. the active bottom-nav tab,
3. the completed-set check,
4. PR and achievement tags (`accent` on `accent-soft`),
5. the focus ring.

Not on selections, tiles, icons, links or emphasis. In code, the raw CSS variable `--accent` is a legacy alias for `text-primary` (removed at the end of the redesign) — new code uses the `accent` utilities, never `var(--accent)`.

### Status

| Token | Value | Use |
|---|---|---|
| `positive` / `positive-soft` | `#5fd38d` / 14% | Good, on-target, recovered, optimal volume |
| `caution` / `caution-soft` | `#ffc94d` / 14% | Needs attention: elevated RPE, deload suggested |
| `negative` / `negative-soft` | `#ff6b6b` / 14% | Errors, destructive actions, missed sessions |

- Always pair a status colour with a word or an icon. Put status text on its `*-soft` tint.
- **Readiness and fatigue** run `negative` → `caution` → `positive`.
- **Volume landmarks:** below MV `negative` (soft) · maintenance `text-tertiary` · sub-optimal `caution` (soft) · optimal `positive` · high `caution` (strong) · over MRV `negative` (strong). One mapping in `src/components/progress/volume-status-styles.ts`.

### Charts

- Categorical series in order: `data-1` `#c5f04a`, `data-2` `#5ab8ff`, `data-3` `#a58bff`, `data-4` `#ffc94d`, `data-5` `#ff8a7a`, `data-6` `#3dd6c6`.
- Grid `var(--border)`; axis ticks `var(--text-secondary)` at 12px.
- Tooltip: `surface-raised` background, `border-strong` border, 12px radius; label `text-primary`, values `text-secondary`.

No gradients or glows. Cards are flat. The only blur is the tab bar's tinted capsule (see BottomNav).

---

## Type

**Geist** for everything you read, **Geist Mono** for numbers (both via `next/font/google`).

| Class | Size / line-height / weight | Use |
|---|---|---|
| `t-display` | 32 / 1.1 / 600, −0.02em | One hero line per screen |
| `t-title-1` | 24 / 1.2 / 600, −0.01em | Page titles |
| `t-title-2` | 20 / 1.25 / 600 | Card titles |
| `t-title-3` | 17 / 1.3 / 600 | Exercise names, list and sheet headings |
| `t-body` | 16 / 1.5 / 400 | Default text |
| `t-body-sm` | 15 / 1.45 / 400 | Secondary paragraphs |
| `t-caption` | 13 / 1.4 / 500 | Meta lines |
| `t-label` | 12 / 1.3 / 500 | Section and field labels |
| `t-stat` | Mono 28 / 1.1 / 500 | Hero numbers |
| `t-value` | Mono 18 / 1.2 / 500 | Set-row weight and reps, key values |
| `t-value-sm` | Mono 15 / 1.3 / 500 | Values in lists |

- **Nothing smaller than 12px.** Inputs use 16px so iOS doesn't zoom.
- Type classes live in `@layer components`, so a colour utility on the same element wins (`t-caption text-tertiary` renders tertiary).

---

## Shape, space and depth

| Token | Value | Use |
|---|---|---|
| `radius-card` | 16px | Cards, PR banner (`rounded-card`) |
| `radius-sheet` | 20px | Bottom sheet, centred dialogs |
| `radius-control` | 12px | Inputs, steppers, nested tiles |
| `radius-field` | 10px | Set-row fields, skeletons |
| `radius-pill` | 999px | **Every** button, chip, toggle chip and the bottom nav |
| `shadow-overlay` | `0 12px 32px rgba(0,0,0,.5)` | Only sheets, menus and the PR banner |

- 4px spacing grid (Tailwind steps). Cards pad 16px; sheets pad 20px with 32px at the bottom; cards stack 12px apart.
- Nest radii outward-in: card 16 → control 12 → field 10.
- Overlays dim the page with black at 60%, no blur (the tab bar's capsule is the one exception).

---

## Interaction and accessibility

- **Touch targets ≥ 44px:** `Button` 48px, inputs 48px, set-row fields and checks 44px, `IconButton` 44px.
- **Focus:** every control shows a 2px lime outline with a 2px offset on keyboard focus (global `:focus-visible`).
- Press feedback: scale to 0.98. Disabled: 40% opacity.
- Motion: short fades only (150–250ms), all wrapped in `prefers-reduced-motion: no-preference`; pulses use `motion-safe:`.
- Pinch-zoom is allowed.
- The bottom nav hides during an active workout.

---

## Components

Import from `@/components/ui`. **Use a component; never restyle it** — feature code may only position it (margin, width, grid). Anything new goes in `src/components/ui/` with its variants in a map.

### Button
The button for every action. Pill, 15px semibold, sentence case.
- `variant`: `primary` (lime — one per screen, for the action the screen exists for), `secondary` (`surface-raised` + `border-strong`), `outline`, `ghost` (cancel/dismiss), `destructive` (`negative` on `negative-soft`; a delete confirm is never lime).
- `size`: `md` 48px (default), `sm` 40px. `fullWidth` (default true), `loading` (disables + `aria-busy` + spinner), `leadingIcon`.
- A link that should look like a button: `<Link className={getButtonClassName({ variant, size, fullWidth })}>` — never a `<button>` inside a link.
- `SubmitButton` wraps it for forms and shows the pending state.

### IconButton
44×44 pill for an icon alone (close, back, more, send). Requires `aria-label`. `variant`: `ghost` (default), `secondary`, `primary` (lime — only when the icon *is* the area's main action, e.g. Coach send). `BackButton` is built on it.

### Card
Flat `surface` + `border` + 16px radius. `padding`: `md` (16px, default) or `none`; `as`: div/section/article. Inside a card use `surface-raised` tiles, never a card in a card. `.card` is the same look as a class (`.glass` is its legacy name).

### Chip
Read-only 24px tag. `tone`: `neutral` (facts like "Strength week"), `accent` (PRs and achievements only), `positive` / `caution` / `negative` (status, always worded). For something the user taps, use ToggleChip.

### ToggleChip
Selectable pill for filters and pickers. `selected`, `size` (`md` 44px default, `sm` 36px for dense rows like a 1–5 picker), `aria-pressed` set for you. Selected = inverted neutral (`bg-primary text-bg`), never lime. Both states carry a 1px border so toggling never shifts layout.

### SectionHeader
`t-title-3` title with an optional "See all" link — the way to move secondary information off a screen.

### Input
48px, `radius-control`, `surface-raised` + `border-strong`, 16px text, lime border on focus, `text-tertiary` placeholder. Label above in `t-label`; errors below in `text-negative`. Forwards its ref (react-hook-form).

### NumberStepper
Input shell with −/+ on either side for weights, reps and rest times. `value`, `onChange`, `step`, `min`, `max`; value in 18px Geist Mono; clamps on blur. Use `step` 2.5 for plates.

### BottomSheet
Overlay for pickers, editors and confirmations; `position` `bottom` (default) or `center`. Portalled to `body`; 60% black backdrop closes it; panel `surface-raised` with `radius-sheet` top corners and `shadow-overlay`; `t-title-3` title and an `IconButton` close.

### Skeleton
Loading placeholder: `surface-raised`, `radius-field`, `motion-safe:animate-pulse`. Mirror the real layout inside the same Card. Never with a spinner.

### Feature components with fixed rules
- **SetRow** (`src/components/workout/SetRow.tsx`): values in `t-value` inside 44px `surface-raised` fields; focused field gets a lime border; the 44px check fills lime when the set is done and the row dims to 60% — the one lime moment per set. Must hold `1,000 kg` and `102.5 × 12` at 375px.
- **PRBanner** (`src/components/workout/PRBanner.tsx`): solid `surface-raised` panel with `shadow-overlay`, lime trophy on `lime-soft`, "New record" in lime, old value struck through in `text-tertiary`, 2px lime countdown, auto-dismiss after 5s.
- **BottomNav** (`src/components/layout/BottomNav.tsx`, tabs in `nav-config.ts`): a floating, iOS-style tinted capsule — 64px tall, 14px from the sides and 18px above the safe area, `surface-raised` at 92% with a 20px backdrop blur, `border-strong` hairline and `shadow-overlay`. Four tabs: **Home** `/dashboard`, **Train** `/routines`, **Progress** `/progress`, **Coach** `/coach`; 20px icons over 12px labels. The active tab is lime on a sliding `accent-soft` pill; others `text-tertiary`. Account pages highlight Home; history, exercises and finished-workout detail highlight Progress.
  - **Scroll:** past 80px from the top, scrolling down 24px collapses the bar to the active tab's icon and slides in a lime "Start workout" button (→ `/routines`), or "Resume workout" (→ `/workout`) while a session is active. Scrolling up 24px or returning to the top expands it. No animation under reduced motion.
  - Hidden on the live workout screen (`/workout`). Page roots reserve `pb-28` so the last item clears it.
- **Progress** (`/progress`; strength rules in `src/lib/tracked-lifts.ts`): answers "am I getting stronger?" first.
  - **Your lifts** (`YourLiftsCard`): up to 6 lifts the lifter picks, or their 5 most-trained compound lifts until they pick ("Your most-trained lifts"). Each row shows the estimated max in `t-value`, the 12-week change and a `Sparkline`, and links to the lift's page.
    - Trend colours: up `text-positive`, flat (±1 kg) `text-tertiary`, down `text-caution`. Never lime.
    - A lift with no sets in 12 weeks says so.
  - **Pick your lifts** (`TrackedLiftsSheet`): opens pre-filled with what the list shows. It has search, "You train often", drag to order (same grip as the logger), a cap of 6, and "Use my most-trained lifts". Saved through `save_tracked_lifts` (all-or-nothing). A failed save keeps the picks and shows a toast.
  - **Tiles** (`ProgressTiles`):
    - Overall strength: the weekly % across *your lifts*, excluding assisted and no-data lifts. It needs 3 lifts with data, and says why when it can't show.
    - Recent PRs this month (any exercise).
    - Workouts this month and streak.
    - Bodyweight trend.
  - **Then** Coaching, and links to Workout history, All exercises and **More stats** (`/progress/more`, every deeper chart).
  - **One strength index everywhere:** coaching and the phase-coach detail use the same lifts (`getStrengthLifts`).
- **Lift page** (`/exercises/[id]`): estimated max in `t-stat` with an accent "Best ever" chip, the 12-week change, and one chart with a 4W / 12W / 1Y / All `ToggleChip` switch (`LiftHeroCard`). Then quick facts (Heaviest or Least assistance, Best recent set, Sessions) and Recent sessions set by set. The PR cards, max-weight and volume charts, coach insights and video follow. Numbers match Progress: weekly bests, one decimal.
- **Workout logger** (`/workout`; session rules in `src/lib/workout-session.ts`, times in `src/lib/time.ts`): built for one hand between sets.
  - **Header:** a 44px ⌄ **Minimize workout** button (leaves the workout running; never discards it), the editable title, `elapsed · N of M exercises` in mono, lime **Finish**, and one neutral chip "Hypertrophy week · 8–12 reps · RPE 7.5".
  - **Exercise cards:** one is open at a time, in every kind of workout. Closed cards are one row with a tally ("2/3", or "3/3 ✓" in `text-positive`).
  - **Open cards:** have **Rest** and **Plates** pills, then labelled columns *Set · Last time · kg · Reps · ✓* (`SET_GRID` in `SetTableHeader.tsx`). Completed sets keep a 44px lime tick on the right.
  - **Drag:** the ⋮⋮ grip (`aria-label="Reorder …"`) moves an exercise, or a whole superset as one block. Touch needs a 200ms hold, so scrolling never picks a card up. Keyboard: Space, arrows, Space. While dragging, every card collapses; the open card reopens on drop.
  - **Rest bar:** floats at the bottom with the countdown in `t-stat`, "Rest · then {next exercise}", **+30s** and **Skip**. Rest is stored as an end time, so it's right after the phone sleeps. It shows "Rest over" for 3s, then closes.
  - **Workout bar** (`WorkoutBar.tsx`): on every other screen while a workout runs, 10px above the tab bar: lime live dot, title, clock, "N of M", **Resume ›**. It replaces the tab bar's Resume accessory. Pages get extra bottom room via `[data-workout-bar='on']`.
  - **Start guard** (`useStartWorkout`): every way of starting a workout asks first if one is running ("Resume …" or "Discard it and start …", with a confirm).
  - **Finish sheet:** one sheet for empty / ready / unticked sets ("Tick them and finish", "Finish without them", "Keep going"), the routine-update toggle, and a quiet "Discard workout".
  - **Layers:** confirm dialogs (`z-[300]`) sit above sheets (`z-[200]`), which sit above the tab bar and workout bar (`z-40`). `src/styles/layers.test.ts` holds the first rule.
- **Home** (`src/app/(app)/dashboard/page.tsx`, cards in `src/components/home/`, decisions in `src/lib/home.ts`): answers three questions and stops. Top to bottom:
  - **Header:** date in `t-caption`, greeting in `t-title-1` (wraps, never truncates), a 44px avatar → `/account`.
  - **Today** (`TodayCard`, shared with Train): a neutral week chip ("Strength week" / "Deload week", only once a phase is running), the suggested routine with "N exercises · M sets", lime **Start workout** and ghost **Not today**. A rest day shows a secondary **Train anyway**. With nothing to suggest it still says "Start a workout" → `/routines`.
  - **This week's muscles** (`ThisWeekMuscles`): the front/back muscle map under Today, with Details → More stats.
  - **This week** (`ThisWeekStats`): Workouts `done/goal`, Volume in tonnes, Readiness 0–100 = `round((avg(sleep, recovery, energy) − 1) / 4 × 100)` with Good (≥75, `positive`) · Fair (50–74, `caution`) · Low (<50, `negative`). No check-in today → "—" and **Check in**, which opens the check-in sheet.
  - **One coach note at most** (`CoachNoteCard`), the first that applies: light-weeks restart › deload › phase complete › size up, strength flat › stalled lift › neglected muscle. Each links to its detail, mostly `/progress#coaching`. The restart note is the Restart / Keep going card itself.
  - **Done for today:** after a split day is logged, Today shows "{day} ✓ · Done for today · N min" and "Up next tomorrow: …" until the phone's own midnight, with a secondary **Train again**.
  - **Latest** (`LatestHighlight`): a PR from the last 7 days with an accent "New best" chip, else the last workout (day · minutes · tonnes) linking to it.
  - Everything else that used to be on Home lives in **Progress → Coaching** (`CoachingSection`): deload / phase / dissociation detail, this week's missions, streaks and badges.
- **My split** (`src/components/routines/MySplitSection.tsx`, editor `SplitEditor.tsx`): the lifter's rotation of routines and rest days, on Train between "Start empty session" and Routines.
  - **Look:** the days sit in a scrolling row of pills; the next day is inverted neutral (`bg-primary text-bg`, `aria-current="step"`), never lime. Under it, an "Up next" card: routine name in `t-title-2`, "N exercises · M sets", a lime **Start** and a ghost **Not today**. A rest day shows "Rest day" with a secondary **Train anyway** — no lime on a rest day.
  - **How the next day is picked** (`src/lib/split-rotation.ts`): the day after the last workout that came from a split routine. Each calendar day that passes after that workout uses up a following rest day. Workouts from routines outside the split don't move it; doing a different routine from the split jumps to that day. **Not today → Skip to next** and **Start from here** (in the editor) set a pointer that wins until a newer split workout is logged. After 7+ days away the card adds "Welcome back — it's been N days." and keeps your place.
  - **No split:** a card invites "Set up your split" and, when a muscle hasn't been trained for 10+ days, shows the suggested routine (or focus) with its reason (`src/lib/split-fallback.ts`).
  - **Editor** (`/routines/split/new`, `/routines/split/<id>`): name, ordered days with move up/down/remove icon buttons (labelled per day), **Add routine** (sheet) and **Add rest day**, an "Active split" ToggleChip, lime **Save**, destructive **Delete split**. Up to 14 days, at least one routine. Only one split is active at a time; another becomes active with "Make active" on Train.
- **Coach** (`/coach`; notes in `src/lib/home.ts`, screen in `src/components/coach/`): notes first, then the chat.
  - **Opening:** caption "Coach" over "This week" in `t-display`, and a 44px Past chats button. **What I noticed** lists every coach note that applies (`pickCoachNotes`), in Home's order, so Home's one note is always Coach's first. Each note shows its kind as a label (caution for light weeks, deload and stalled lift), title, body, **Ask about this ›** (starts a chat with the note's `prompt`) and its usual action link. Nothing applies → "Nothing needs attention this week."
  - **Recent chats:** the last 3 with a short date (`chatWhen`) and **See all** (the history sheet). Untitled chats read "New chat".
  - **Chat:** a top bar with ‹ back to notes, the chat's title and ＋ new chat. The lifter's messages sit in a `surface-raised` bubble; the coach's are plain text. Saved routines keep their card with "Saved" and a link to Routines. The box reads "Ask your coach…". A reply is saved even if the lifter leaves mid-answer (`createStreamSender`).
  - **Deep links:** `/coach?prompt=…` (stalled lifts, workout insight) skip the notes and start a fresh chat with that question.
  - No badges or sales copy ("PRO", "precision"…).
- **Workout detail** (`/workout/[id]`; numbers in `src/lib/workout-summary.ts`): a past workout, summary first.
  - **Top bar:** ‹ to history, **Perform again**, and ⋯ (`WorkoutActionsMenu`: Edit details, Delete workout).
  - **Summary:** date and time, title in `t-display`, notes; tap to edit. Then one card with Time · Volume · Sets · PRs in mono, PRs in lime only when above 0. Then **Muscles trained**, the front/back map with sets per muscle.
  - **Log:** one card per exercise (name → lift page, muscle, a 44px remove button), then one row per set: number, or **W** in caution for warm-ups, `weight × reps` in mono, and a lime trophy on PR sets. Tap a set to edit it.
  - **Coach's read** last, with Ask Coach.

### Where things live
- Account and settings: the profile picture on Home → `/account` (import at `/account/import`, "Clear all data" under Danger zone).
- Workout history `/history` and exercises `/exercises`, both reached from the top of Progress.
- Your split: Train → My split → Edit (`/routines/split/<id>`).
- Old `/profile` links redirect (`?tab=history` → `/history`, `?tab=exercises` → `/exercises`, everything else → `/account`).

---

## Icons and logo

- **lucide-react**, outline. 18px in the nav (stroke 2 active, 1.5 at rest), 16px inside controls. Icons inherit `currentColor`.
- The app icon (`public/icons/`) is a lime "L" with a barbell on navy — its lime matches the accent. Use it only as the app icon; in the UI, set "Lifts" in Geist.

---

## Guard rails

`npx eslint src` fails with `Design:` errors on, outside the primitive files:
- raw hex or `rgb()/rgba()` colours,
- Tailwind arbitrary colours (`bg-[#…]`) and pixel font sizes (`text-[11px]`),
- Tailwind palette colours (`text-white`, `bg-red-500`…) and off-palette greys (`zinc-*`, `gray-*`…),
- legacy token references (`var(--accent)`, `var(--text-hi)`, `var(--glass-…)`…). The aliases themselves are deleted, so these no longer resolve to anything.

All are at zero. A real exception takes an inline `eslint-disable-next-line` with the reason (e.g. real-world plate colours in PlateCalculator). `src/styles/tokens.test.ts` checks the contrast pairs above.

---

## What's next

The redesign is complete: every screen uses this system, the legacy aliases and `.glass` are gone, and the design rule is an error. Next: coach powers (step 6b), where the coach can look up the exercise library and propose swaps and reorders in the lifter's routines, with a confirm before anything changes.

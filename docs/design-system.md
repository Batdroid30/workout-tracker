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

### Where things live
- Account and settings: the profile picture on Home → `/account` (import at `/account/import`, "Clear all data" under Danger zone).
- Workout history `/history` and exercises `/exercises`, both reached from the top of Progress.
- Old `/profile` links redirect (`?tab=history` → `/history`, `?tab=exercises` → `/exercises`, everything else → `/account`).

---

## Icons and logo

- **lucide-react**, outline. 18px in the nav (stroke 2 active, 1.5 at rest), 16px inside controls. Icons inherit `currentColor`.
- The app icon (`public/icons/`) is a lime "L" with a barbell on navy — its lime matches the accent. Use it only as the app icon; in the UI, set "Lifts" in Geist.

---

## Guard rails

`npx eslint src` warns (`Design:` messages) on, outside the primitive files:
- raw hex or `rgb()/rgba()` colours,
- Tailwind arbitrary colours (`bg-[#…]`) and pixel font sizes (`text-[11px]`),
- Tailwind palette colours (`text-white`, `bg-red-500`…) and off-palette greys (`zinc-*`, `gray-*`…),
- legacy token references (`var(--accent)`, `var(--text-hi)`, `var(--glass-…)`…).

All are at zero. A real exception takes an inline `eslint-disable-next-line` with the reason (e.g. real-world plate colours in PlateCalculator). `src/styles/tokens.test.ts` checks the contrast pairs above.

---

## What's next

Steps 1 (visual foundation) and 2 (navigation) are done. Coming: redesigned Home, workout logger, Progress (with history and exercises) and Coach. Legacy token aliases are deleted in the last step.

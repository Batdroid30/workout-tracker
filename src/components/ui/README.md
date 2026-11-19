# UI primitives

Shared building blocks for the Ink + Lime design system. Import from `@/components/ui`.

- `Button` - pill button; variants `primary` (lime), `secondary`, `ghost`, `outline`, `destructive`
- `IconButton` - 44x44 pill icon button; requires `aria-label`
- `Card` - surface container with the standard radius and border
- `Chip` - small status or filter label; tones map to semantic colours
- `SectionHeader` - section title with optional trailing action
- `Input` - 16px text field with lime focus border
- `NumberStepper` - numeric field with - / + tap targets
- `BottomSheet` - portal overlay, bottom or centred
- `Skeleton` - loading placeholder, pulse respects reduced motion
- `SubmitButton` - form submit button with pending state
- `BackButton` - router back, built on `IconButton`

## Rules

- Use a primitive. Feature code may only position it (margin, width, grid).
- Colours come only from tokens (`bg-surface`, `text-primary`, ...). No raw hex, rgba or inline colour styles.
- Anything new goes in `src/components/ui/` with its variants defined in a map.

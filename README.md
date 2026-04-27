# 🏁 Developer Handover: Lifts Workout Tracker

> **Internal Documentation & System Manual**  
> This document is designed for the incoming engineering team to understand, maintain, and evolve the **Lifts** platform.

---

## 0. The Prime Directive
**Write code for the next developer, not the compiler.**  
This project follows strict engineering principles (SOLID, Type Safety, and Atomic Design). Every decision—from the repository pattern to the global revalidation strategy—is optimized for **clarity and maintainability** over cleverness.

---

## 1. State of the Union (Current Progress)

Lifts is currently in a stable **v0.8 phase**. The core tracking engine is robust, and we have recently simplified the architecture to prepare for AI integration.

### ✅ Implemented
- **High-Performance Logging**: Zero-friction workout logging with Zustand-backed persistence.
- **Heuristic Coaching Engine**: Data-driven insights for volume, fatigue, and muscle imbalances.
- **Import System**: Fully functional mapping engine for Hevy/CSV data.
- **Refined Caching**: React 19 request deduplication + Global revalidation.

### 🚧 In Progress (Next Steps)
- **AI Coach Integration**: Replacing heuristics with a Google Gemini-powered conversational coach (see `implementation_plan.md`).
- **Smart Prediction**: Real-time exercise prediction based on routine frequency.
- **Automatic Deloads**: System-generated recovery routines based on fatigue scores.

---

## 2. Architecture & Decision Log

### 2.1 Why the Repository Pattern? (`src/lib/data/`)
We **never** call Supabase directly from a UI component or a Page.
- **Reason**: This centralizes security (RLS), error handling, and type mapping.
- **Rule**: If you need data, create/use a function in `src/lib/data/`. If you are writing data, use a Server Action that calls these functions.

### 2.2 The "Nuclear" Caching Strategy
We recently removed `unstable_cache` and complex tag management.
- **How it works**: We use React 19's `cache()` to deduplicate DB calls within a single request (render cycle). After any mutation (Save, Delete, Update), we call `revalidateAll()` which executes `revalidatePath('/', 'layout')`.
- **The Payoff**: Guaranteed data freshness across the entire app with zero manual cache-tag maintenance.

### 2.3 Styling Strategy
- **Tailwind CSS 4**: We use the latest Tailwind version. Avoid "magic numbers" in CSS; stick to the design system tokens.
- **Aesthetics**: The UI is mobile-first and uses "Rich Aesthetics" (glassmorphism, subtle micro-animations).

---

## 3. Critical Workspace Map

| Path | Description | Responsibility |
| :--- | :--- | :--- |
| `src/app/(app)` | Protected Routes | Ensure all pages here use the `auth` middleware. |
| `src/lib/data` | Data Repositories | **Single source of truth** for database interactions. |
| `src/lib/insights.ts` | The Brain | Contains the logic for coaching tips and stall detection. |
| `src/store/useWorkoutStore.ts` | Active State | Manages the workout-in-progress. Persists to LocalStorage. |
| `src/lib/cache.ts` | Cache Control | Contains the `revalidateAll` helper. |

---

## 4. Onboarding & Setup

### Environment Variables
You need a `.env.local` with the following:
```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # Used for admin operations/imports
AUTH_SECRET=... # For NextAuth
```

### Database & RLS
Security is enforced at the DB level.
- **Policies**: Every table has RLS enabled. Most allow `(select where user_id = auth.uid())`.
- **Admin Access**: Use `getSupabaseAdmin()` only for background jobs, imports, or cross-user analytics.

---

## 5. Known "Gotchas" & Advice

1. **Hydration Errors**: Since we persist the `useWorkoutStore` to LocalStorage, ensure you handle hydration properly in components that read active workout state (use a `useEffect` to set a `mounted` flag).
2. **Import Mapping**: When adding new exercises to the CSV import mapper, ensure the fuzzy-matching logic in `src/lib/data/import.ts` is updated to avoid duplicates.
3. **Zod Validation**: Always use `.safeParse` in Server Actions to return user-friendly errors instead of crashing the action.

---

## 6. Roadmap: Where to take it next

1. **LLM Coaching**: Transition the `deriveCoachTips` function in `insights.ts` to use a Vercel AI SDK stream.
2. **PWA Support**: Enhance the manifest and service worker for a truly native "Offline-First" logging experience.
3. **Social Layers**: Implement "Training Squads" using Supabase Realtime for shared live workouts.

---

*Handed over with confidence. Go build something great.*

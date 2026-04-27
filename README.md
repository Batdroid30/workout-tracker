This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

# Project Documentation: Lifts Workout Tracker

This document serves as the comprehensive guide for the **Lifts Workout Tracker** project. It is designed to help developers (from beginners to experts) understand the architecture, codebase, and technical decisions behind the application.

---

## 1. Project Overview

**Lifts** is a high-performance, mobile-first workout tracking application. It allows users to log workouts, track personal records (PRs), manage routines, and visualize progress through advanced analytics.

### Key Value Propositions
- **Seamless Logging**: A "zero-friction" interface for logging sets, reps, and weight.
- **Progress Insights**: Real-time calculation of Estimated 1RM (e1RM), volume trends, and muscle group balance.
- **Data Portability**: Built-in support for importing data from other popular apps (e.g., Hevy).
- **Gamification**: An achievements system to keep users motivated.

---

## 2. Technology Stack

The project uses a modern, enterprise-grade stack optimized for performance and type safety:

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) — Utilizing Server Components for performance and Server Actions for data mutations.
- **Language**: [TypeScript](https://www.typescriptlang.org/) — Strict typing across the entire stack.
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) — Utility-first CSS with a custom design system.
- **Database & Auth**: [Supabase](https://supabase.com/) — PostgreSQL database, Real-time capabilities, and Authentication.
- **State Management**: [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction) — Lightweight store for active workout state and UI preferences.
- **Data Fetching/Caching**: [SWR](https://swr.vercel.app/) (Client) & `unstable_cache` (Server).
- **Charts**: [Recharts](https://recharts.org/) — Interactive SVG charts for progress visualization.
- **Validation**: [Zod](https://zod.dev/) — Schema validation for API inputs and database rows.

---

## 3. Architecture & Workspace Structure

The project follows a modular architecture that separates concerns between UI, business logic, and data access.

### Workspace Map (`/src`)

| Directory | Purpose |
| :--- | :--- |
| `app/` | **Routing Layer**: Contains all pages, layouts, and API routes. Organized by route groups like `(app)` for protected routes and `(auth)` for login/signup. |
| `components/` | **UI Layer**: Reusable React components. Usually categorized into `ui/` (base components like buttons) and feature-specific folders (e.g., `workout/`, `charts/`). |
| `lib/` | **Logic Layer**: The "brain" of the app. Contains data repositories, utility functions, and complex algorithms. |
| `hooks/` | **Interaction Layer**: Custom React hooks for shared logic (e.g., `useActiveWorkout`). |
| `store/` | **State Layer**: Zustand stores for client-side state that persists across pages. |
| `types/` | **Type Layer**: Shared TypeScript interfaces and database schemas. |
| `providers/` | **Context Layer**: React Context providers (Auth, Theme, Toast). |

---

## 4. How the App Works (The Data Flow)

### 4.1 Data Fetching (Read)
1. **Server-Side**: Pages call "Repository" functions from `src/lib/data/*.ts`.
2. **Caching**: These functions are wrapped in `unstable_cache`. If the data is in the cache and hasn't been "busted," it returns instantly.
3. **Database**: If cache-miss, the function calls Supabase using the `getSupabaseAdmin` or `getSupabaseServer` client.

### 4.2 Data Mutations (Write)
1. **User Action**: User clicks "Save Workout".
2. **Server Action**: A Next.js Server Action is triggered.
3. **Validation**: The action validates the input using **Zod**.
4. **Repository**: The action calls a repository function (e.g., `saveActiveWorkout`).
5. **Cache Busting**: After a successful write, a "Bust Helper" from `src/lib/cache.ts` is called to invalidate related cached data (e.g., `bustAfterWorkout`).

---

## 5. Key Features in Detail

### 5.1 Workout Logging
- **Active State**: When a user starts a workout, the state is held in a Zustand store (`src/store/useWorkoutStore.ts`). This allows users to navigate the app without losing their progress.
- **Rest Timer**: A built-in timer that triggers automatically after a set is completed.
- **Smart Defaults**: The app suggests weights and reps based on the user's previous performance for that specific exercise.

### 5.2 Progress Analytics
- **Volume Tracking**: Calculates `weight * reps` across all sets to show weekly/monthly workload.
- **1RM Progression**: Uses the **Epley Formula** (`weight * (1 + reps / 30)`) to estimate strength without requiring a max-effort lift.
- **Muscle Group Radar**: Visualizes training balance across Chest, Back, Legs, etc., to identify neglected areas.

### 5.3 Import System (`src/lib/data/import.ts`)
- Supports CSV imports from apps like Hevy.
- **Mapping Engine**: Automatically maps external exercise names to the internal database IDs, creating new exercises if they don't exist.

---

## 6. Technical Implementation Details

### 6.1 Supabase Integration
We use two types of Supabase clients defined in `src/lib/supabase/server.ts`:
- `getSupabaseServer()`: Uses the user's session cookies. Respects **Row Level Security (RLS)**. Use this for general user data.
- `getSupabaseAdmin()`: Uses the `SERVICE_ROLE_KEY`. Bypasses RLS. Use this for complex operations (like imports) or when you need to perform cross-user aggregations.

### 6.2 Caching Strategy (`src/lib/cache.ts`)
We use a **Tag-Based Invalidation** strategy:
- Every cached query has a unique tag (e.g., `workouts-USER_ID`).
- We never expire cache on a timer (`revalidate: false`).
- Instead, we manually "bust" the cache only when we know data has changed.
- **Benefit**: Extremely fast page loads (0ms DB latency) with guaranteed data freshness.

### 6.3 Security & RLS
Security is enforced at the database layer:
- **Profiles**: `auth.uid() = id`.
- **Workouts**: `auth.uid() = user_id`.
- **Exercises**: Publicly readable, but only admins can write.
- **Personal Records**: Automatically updated via Database Triggers or controlled Server Actions.

---

## 7. Development Guidelines

### Adding a New Feature
1. **Define Types**: Add any new database types to `src/types/database.ts`.
2. **Create Repository**: Add fetch/write logic in `src/lib/data/`.
3. **Define Cache Tags**: Add new tags to `TAGS` in `src/lib/cache.ts`.
4. **Build UI**: Create components and then the page in `src/app/`.

### Best Practices
- **Atomic Components**: Keep components small. If a component exceeds 100 lines, split it.
- **Pure Logic**: Put math and algorithms in `src/lib/algorithms.ts` so they can be tested easily.
- **Error Handling**: Always wrap DB calls in `try/catch` and use the custom `DatabaseError` class.

---

## 8. Summary for Beginners
If you are new to the project:
1. Start by looking at `src/app/(app)/dashboard/page.tsx` to see how data is displayed.
2. Check `src/lib/data/workouts.ts` to see how we talk to the database.
3. Look at `src/store/useWorkoutStore.ts` to understand how we track a workout while it's in progress.

**The Holy Rule**: Never call Supabase directly from a Page. Always go through a `src/lib/data` function to ensure caching and error handling are applied correctly.

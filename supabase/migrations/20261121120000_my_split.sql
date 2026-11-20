-- My split (step 3b of the redesign).
--
-- 1. workouts.routine_id — which saved routine a finished workout came from.
--    The rotation needs it; until now only the in-progress workout knew.
--    No past workout matches a routine by title, so there is no backfill.
-- 2. training_splits / training_split_items — an ordered loop of routines and
--    rest days (routine_id null). One active split per user.
--
-- RLS follows 20261119140000_rls_policy_cleanup.sql: `to authenticated`,
-- `(select auth.uid())` evaluated once per query, explicit WITH CHECK.
--
-- Rollback:
--   drop table public.training_split_items; drop table public.training_splits;
--   alter table public.workouts drop column routine_id;

alter table public.workouts
  add column if not exists routine_id uuid references public.routines(id) on delete set null;

create index if not exists idx_workouts_user_routine_started
  on public.workouts (user_id, routine_id, started_at desc);

create table if not exists public.training_splits (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 60),
  is_active         boolean not null default false,
  skip_to_position  int,
  skip_set_at       timestamptz,
  created_at        timestamptz not null default now()
);

create index if not exists idx_training_splits_user_id on public.training_splits (user_id);
create unique index if not exists one_active_split_per_user
  on public.training_splits (user_id) where is_active;

create table if not exists public.training_split_items (
  id          uuid primary key default gen_random_uuid(),
  split_id    uuid not null references public.training_splits(id) on delete cascade,
  position    int not null,
  routine_id  uuid references public.routines(id) on delete cascade,
  unique (split_id, position)
);

create index if not exists idx_training_split_items_split_id on public.training_split_items (split_id);
create index if not exists idx_training_split_items_routine_id on public.training_split_items (routine_id);

alter table public.training_splits enable row level security;
alter table public.training_split_items enable row level security;

create policy "users own training splits" on public.training_splits
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "users own training split items" on public.training_split_items
  for all to authenticated
  using (split_id in (select s.id from public.training_splits s where s.user_id = (select auth.uid())))
  with check (split_id in (select s.id from public.training_splits s where s.user_id = (select auth.uid())));

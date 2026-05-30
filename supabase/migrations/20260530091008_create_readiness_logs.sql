-- Migration: Create readiness_logs table

create table public.readiness_logs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    sleep_score integer not null check (sleep_score >= 1 and sleep_score <= 5),
    soreness_score integer not null check (soreness_score >= 1 and soreness_score <= 5),
    energy_score integer not null check (energy_score >= 1 and energy_score <= 5),
    logged_at date not null default current_date,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    
    unique (user_id, logged_at)
);

-- Enable RLS
alter table public.readiness_logs enable row level security;

-- Policies
create policy "Users can view their own readiness logs"
    on public.readiness_logs for select
    using (auth.uid() = user_id);

create policy "Users can insert their own readiness logs"
    on public.readiness_logs for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own readiness logs"
    on public.readiness_logs for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own readiness logs"
    on public.readiness_logs for delete
    using (auth.uid() = user_id);

-- Create index for faster querying by user and date
create index idx_readiness_logs_user_date on public.readiness_logs(user_id, logged_at);

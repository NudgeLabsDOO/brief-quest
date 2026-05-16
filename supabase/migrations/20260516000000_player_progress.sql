-- Migration: create player_progress table with RLS
-- Each row stores all completed levels for one authenticated user.

create table if not exists public.player_progress (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  completed_levels jsonb not null default '[]'::jsonb,
  updated_at     timestamptz not null default now()
);

comment on table public.player_progress is
  'Stores per-user level completion data for Brief Quest.';
comment on column public.player_progress.completed_levels is
  'JSON array of LevelCompletion objects (scenarioId, score, starsEarned, completedAt).';

-- Enable Row Level Security
alter table public.player_progress enable row level security;

-- Policy: users can only read their own row
create policy "Users can read own progress"
  on public.player_progress
  for select
  using (auth.uid() = user_id);

-- Policy: users can insert their own row
create policy "Users can insert own progress"
  on public.player_progress
  for insert
  with check (auth.uid() = user_id);

-- Policy: users can update their own row
create policy "Users can update own progress"
  on public.player_progress
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger player_progress_updated_at
  before update on public.player_progress
  for each row execute function public.set_updated_at();

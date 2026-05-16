-- Brief Quest: player progress table
-- Stores completed levels and scores per authenticated user

create table if not exists player_progress (
  user_id uuid references auth.users(id) on delete cascade primary key,
  completed_levels jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS: users can only read/write their own row
alter table player_progress enable row level security;

create policy "Users can read own progress"
  on player_progress for select
  using (auth.uid() = user_id);

create policy "Users can insert own progress"
  on player_progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on player_progress for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger player_progress_updated_at
  before update on player_progress
  for each row execute procedure update_updated_at_column();

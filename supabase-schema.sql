-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)

create table workouts (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null check (day_of_week between 0 and 6),
  person text not null check (person in ('zdb', 'tbo')),
  title text not null default '',
  exercises jsonb not null default '[]'::jsonb,
  notes text,
  updated_at timestamptz not null default now(),
  unique(day_of_week, person)
);

create table workout_logs (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null check (day_of_week between 0 and 6),
  person text not null check (person in ('zdb', 'tbo')),
  log_date date not null,
  exercise_logs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(day_of_week, log_date, person)
);

-- Allow public read/write (simple 2-person app)
alter table workouts enable row level security;
alter table workout_logs enable row level security;

create policy "Anyone can read workouts" on workouts for select using (true);
create policy "Anyone can insert workouts" on workouts for insert with check (true);
create policy "Anyone can update workouts" on workouts for update using (true);

create policy "Anyone can read logs" on workout_logs for select using (true);
create policy "Anyone can insert logs" on workout_logs for insert with check (true);
create policy "Anyone can update logs" on workout_logs for update using (true);

-- Activity tracking (last seen)
create table activity_log (
  person text primary key check (person in ('zdb', 'tbo')),
  last_seen timestamptz not null default now()
);

alter table activity_log enable row level security;
create policy "Anyone can read activity" on activity_log for select using (true);
create policy "Anyone can insert activity" on activity_log for insert with check (true);
create policy "Anyone can update activity" on activity_log for update using (true);

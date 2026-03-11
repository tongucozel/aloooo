-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New query)

create table workouts (
  id uuid primary key default gen_random_uuid(),
  day_of_week integer not null check (day_of_week between 0 and 6),
  title text not null default '',
  exercises jsonb not null default '[]'::jsonb,
  notes text,
  updated_at timestamptz not null default now(),
  unique(day_of_week)
);

-- Allow public read (girlfriend can see workouts without login)
alter table workouts enable row level security;

create policy "Anyone can read workouts"
  on workouts for select
  using (true);

create policy "Anyone can insert workouts"
  on workouts for insert
  with check (true);

create policy "Anyone can update workouts"
  on workouts for update
  using (true);

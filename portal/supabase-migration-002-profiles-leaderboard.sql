-- Migration 002: Profiles table + Leaderboard view
-- Run this in Supabase SQL Editor AFTER the initial schema

-- Profiles: stores username for display
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  username    text not null default 'Player',
  created_at  timestamptz default now()
);

-- RLS: users can read all profiles (for leaderboard) but only update their own
alter table profiles enable row level security;

create policy "Anyone can read profiles"
  on profiles for select
  using (true);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Leaderboard materialized view
-- Computes Elo from match_history using the same formula as the client:
-- BASE_ELO=500, K=32, AI ratings: easy=500, medium=1000, hard=1500
-- Also computes an '_overall' entry (average Elo across all games played)

create or replace view leaderboard as
with game_elo as (
  select
    m.user_id,
    m.game_id,
    count(*) as games_played,
    -- Elo calculation: iterative sum of K*(actual - expected)
    -- We approximate with the aggregate formula since SQL can't do iterative easily
    500 + sum(
      32 * (
        case when m.won then 1.0 else 0.0 end
        - 1.0 / (1.0 + power(10.0, (
          case m.difficulty
            when 'easy' then 500.0
            when 'hard' then 1500.0
            else 1000.0
          end - 500.0
        ) / 400.0))
      )
    )::integer as elo
  from match_history m
  group by m.user_id, m.game_id
),
overall as (
  select
    user_id,
    '_overall' as game_id,
    sum(games_played)::integer as games_played,
    avg(elo)::integer as elo
  from game_elo
  group by user_id
),
combined as (
  select * from game_elo
  union all
  select * from overall
)
select
  c.user_id,
  c.game_id,
  p.username,
  c.elo,
  c.games_played
from combined c
join profiles p on p.id = c.user_id
where c.games_played >= 3;  -- minimum 3 games to appear on leaderboard

-- Allow anyone to read the leaderboard (it's a view over match_history + profiles)
-- Views inherit the RLS of the underlying tables, but since we want public read
-- we need to grant select. The anon role can read profiles (policy above).
-- For match_history, we need a select-only policy for aggregation:
create policy "Anyone can read match history for leaderboard"
  on match_history for select
  using (true);

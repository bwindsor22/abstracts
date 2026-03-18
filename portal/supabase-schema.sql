-- Abstracts — Supabase Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- Match history: one row per game played
create table match_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  game_id     text not null,
  game_name   text not null,
  won         boolean not null,
  moves       integer,
  difficulty  text,
  played_at   timestamptz default now()
);

-- Badges earned: one row per user per badge
create table badges_earned (
  user_id     uuid references auth.users on delete cascade,
  badge_id    text not null,
  earned_at   timestamptz default now(),
  primary key (user_id, badge_id)
);

-- Row Level Security: users can only read/write their own data
alter table match_history enable row level security;
alter table badges_earned enable row level security;

create policy "Users can manage their own match history"
  on match_history for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage their own badges"
  on badges_earned for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Index for fast user lookups
create index idx_match_history_user on match_history(user_id, played_at desc);
create index idx_badges_earned_user on badges_earned(user_id);

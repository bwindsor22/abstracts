# Abstracts — Deployment & Auth Plan
*Draft — pending approval before implementation*

---

## Goals

1. **Play for free, no account required** — guest mode works immediately; state lives in localStorage
2. **Sign in to persist** — match history, ELO, and badges sync to the cloud and restore on any device
3. **One-click deploys** — every push to `main` auto-deploys to production

---

## Stack

| Layer | Service | Tier | Cost |
|---|---|---|---|
| Frontend hosting | Vercel | Hobby (free) | $0 |
| Database + Auth | Supabase | Free tier | $0 |
| Domain (optional) | Vercel custom domain | Free | $0 + domain reg |

---

## Phase 1 — Vercel Deploy (no code changes)

### What to do

1. Sign up at vercel.com with GitHub
2. Import `bwindsor22/abstracts`
3. Set **Root Directory** to `portal`
4. Set **Framework Preset** to `Create React App`
5. Add `vercel.json` at repo root (routes all paths to portal's index.html for SPA routing)
6. Deploy → get a live URL like `abstracts.vercel.app`

### `vercel.json` (5 lines)

```json
{
  "buildCommand": "cd portal && npm install --legacy-peer-deps && npm run build",
  "outputDirectory": "portal/build",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### Result

- Every push to `main` → auto-deploy to production
- Every PR → preview deploy at a unique URL
- Build logs visible in Vercel dashboard

---

## Phase 2 — Supabase Auth + Persistent State

### Account setup

1. Sign up at supabase.com with GitHub
2. Create a new project (choose a nearby region, e.g. `us-east-1`)
3. Save the **Project URL** and **anon key** from Project Settings → API
4. Add them as Vercel environment variables:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`

### Database schema

```sql
-- Match history: one row per game played
create table match_history (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  game_id     text not null,         -- 'hexes', 'marbles', etc.
  game_name   text not null,
  won         boolean not null,
  moves       integer,
  difficulty  text,
  played_at   timestamptz default now()
);

-- ELO ratings: one row per user per game, updated on each match
create table elo_ratings (
  user_id     uuid references auth.users on delete cascade,
  game_id     text not null,
  elo         integer not null default 1200,
  primary key (user_id, game_id)
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
alter table elo_ratings enable row level security;
alter table badges_earned enable row level security;

create policy "own data only" on match_history for all using (auth.uid() = user_id);
create policy "own data only" on elo_ratings for all using (auth.uid() = user_id);
create policy "own data only" on badges_earned for all using (auth.uid() = user_id);
```

### Auth providers to enable (in Supabase dashboard)

- Email / password (always on)
- Google OAuth (requires Google Cloud Console app — ~5 min setup)
- GitHub OAuth (requires GitHub OAuth App — ~2 min setup)

### New files

```
portal/src/
  utils/
    supabase.js       ← init client; saveResult(), loadHistory(), loadBadges()
  components/
    AuthModal.jsx     ← sign in / sign up UI
    AuthModal.css
```

### Changes to existing files

| File | Change |
|---|---|
| `portal/package.json` | add `@supabase/supabase-js` |
| `portal/src/App.js` | detect auth session; call `supabase.saveResult()` after `handleResult`; load cloud data on sign-in |
| `portal/src/components/NavDrawer.jsx` | add Sign In / Sign Out button; show username when signed in |
| `portal/src/utils/storage.js` | no changes — localStorage stays as the primary layer |

### State sync strategy

```
App load:
  if signed in → fetch Supabase history/ELO/badges, merge into localStorage (Supabase wins on conflict)
  if guest → use localStorage only

On each game result (handleResult):
  1. Write to localStorage immediately (instant, works offline)
  2. If signed in → write to Supabase (fire-and-forget, non-blocking)

On sign-in:
  1. Fetch cloud data
  2. If localStorage has data the cloud doesn't → prompt: "Import your guest progress?"
  3. On confirm: bulk-insert localStorage entries into Supabase
```

### Sign-in UI

- Triggered from the NavDrawer (profile avatar / "Sign In" link)
- Modal with three options: Google, GitHub, email+password
- After sign-in: modal closes, nav drawer shows username + avatar
- Sign-out clears the session; app reverts to localStorage-only guest mode

---

## Phase 3 — Leaderboards (optional, future)

Once user data exists in Supabase, a public leaderboard is straightforward:

```sql
-- Public ELO leaderboard view (no PII exposed)
create view leaderboard as
  select
    p.username,
    e.game_id,
    e.elo,
    rank() over (partition by e.game_id order by e.elo desc) as rank
  from elo_ratings e
  join profiles p on p.id = e.user_id
  where e.elo > 1200;
```

A `profiles` table (username, avatar URL) would be added, populated on first sign-in.

---

## Implementation phases

### Phase 1 (Vercel — ~30 min, no code)
1. Create Vercel account (GitHub login)
2. Import repo, configure root + build settings
3. Add `vercel.json` to repo
4. Push → verify live URL works

### Phase 2 (Supabase — ~2–3 hrs of code)
1. Create Supabase account + project
2. Run SQL schema in Supabase SQL editor
3. Enable OAuth providers in Supabase dashboard
4. Add `@supabase/supabase-js` to portal
5. Write `utils/supabase.js`
6. Write `AuthModal.jsx`
7. Wire auth into `App.js` + `NavDrawer.jsx`
8. Add env vars to Vercel
9. Test: guest play → sign in → verify cloud sync → sign out → re-sign-in → verify restore

---

## Domain Registration

You have two options:

### Option A: Buy through Vercel (simplest)

1. Go to Vercel dashboard → Domains → Buy
2. Search for your domain (e.g. `abstracts.games`, `playabstracts.com`)
3. Purchase — DNS is auto-configured, zero setup
4. Typical cost: ~$10–20/year depending on TLD

### Option B: Buy from a registrar, point to Vercel

1. Buy from Namecheap, Cloudflare Registrar, or Google Domains (~$8–15/year for `.com`)
2. In Vercel: Project Settings → Domains → Add your domain
3. Vercel gives you DNS records (either nameservers or A/CNAME records)
4. Add those records at your registrar
5. SSL is automatic either way

**Recommendation:** Option A if you want zero friction. Option B if you want Cloudflare's DNS/CDN or already have a registrar account.

---

## Multiplayer Capability (Supabase Realtime)

Supabase includes **Realtime** — WebSocket channels with presence and broadcast — on the free tier. This is well-suited for turn-based multiplayer in abstract games.

### What Supabase Realtime provides

| Feature | How it helps |
|---|---|
| **Broadcast** | Send game moves between players in real time (JSON messages over WebSocket) |
| **Presence** | Track who's online, show "opponent connected" status |
| **Postgres Changes** | Listen for database row changes (e.g. new move inserted → opponent notified) |

### How multiplayer would work

```
Player A creates a game → gets a room code (e.g. "ABCD")
Player B joins with the room code
Both subscribe to Supabase channel: `game:ABCD`

On each move:
  1. Player sends move via channel.send({ type: 'move', data: {...} })
  2. Opponent receives it instantly via channel.on('move', ...)
  3. Move is also persisted to a `game_moves` table for reconnection/replay
```

### Additional schema for multiplayer

```sql
-- Active games (matchmaking + reconnection)
create table games (
  id          text primary key,              -- room code
  game_type   text not null,                 -- 'hexes', 'walls', etc.
  player1     uuid references auth.users,
  player2     uuid references auth.users,
  state       jsonb,                         -- current game state (for reconnection)
  status      text default 'waiting',        -- waiting, active, finished
  created_at  timestamptz default now()
);

-- Move log (for replay and reconnection)
create table game_moves (
  id          uuid primary key default gen_random_uuid(),
  game_id     text references games on delete cascade,
  player      uuid references auth.users,
  move_data   jsonb not null,
  move_number integer not null,
  created_at  timestamptz default now()
);
```

### Free tier limits

- **Realtime:** 200 concurrent connections, 2M messages/month — plenty for early multiplayer
- **Database:** 500 MB storage, 50K monthly active users
- **No separate WebSocket server needed** — Supabase handles it

### Implementation effort

Multiplayer would be a **Phase 4** after auth is working. Each game's `Game.js` already has pure `initState` / `applyMove` functions, so the core logic is ready — only the UI layer needs to send/receive moves over the channel instead of calling the AI.

---

## What's NOT in scope (for now)

- Server-side rendering (CRA is pure SPA, Vercel handles it fine)
- Paid tiers (free tiers are sufficient for early users)
- Custom backend / API routes (Supabase client SDK is called directly from the browser)
- Mobile apps (web-only for now)
- Matchmaking system (Phase 4+ — room codes are sufficient to start)

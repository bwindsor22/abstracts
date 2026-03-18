import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// ── Auth helpers ────────────────────────────────────────────────────────────

export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(email, password) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithProvider(provider) {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ── Cloud sync ──────────────────────────────────────────────────────────────

export async function pushResult(userId, result) {
  const { error } = await supabase.from('match_history').insert({
    user_id: userId,
    game_id: result.gameId,
    game_name: result.gameName,
    won: result.won,
    moves: result.moves,
    difficulty: result.difficulty,
    played_at: new Date(result.timestamp).toISOString(),
  });
  if (error) console.warn('Failed to sync result:', error.message);
}

export async function pushBadge(userId, badgeId, earnedAt) {
  const { error } = await supabase.from('badges_earned').upsert({
    user_id: userId,
    badge_id: badgeId,
    earned_at: new Date(earnedAt).toISOString(),
  }, { onConflict: 'user_id,badge_id' });
  if (error) console.warn('Failed to sync badge:', error.message);
}

export async function fetchCloudHistory(userId) {
  const { data, error } = await supabase
    .from('match_history')
    .select('*')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(500);
  if (error) { console.warn('Failed to fetch history:', error.message); return []; }
  return data.map(row => ({
    gameId: row.game_id,
    gameName: row.game_name,
    won: row.won,
    moves: row.moves,
    difficulty: row.difficulty,
    timestamp: new Date(row.played_at).getTime(),
  }));
}

export async function fetchCloudBadges(userId) {
  const { data, error } = await supabase
    .from('badges_earned')
    .select('*')
    .eq('user_id', userId);
  if (error) { console.warn('Failed to fetch badges:', error.message); return []; }
  return data.map(row => ({
    id: row.badge_id,
    earnedAt: new Date(row.earned_at).getTime(),
  }));
}

// ── Merge cloud data into localStorage ──────────────────────────────────────

export async function syncFromCloud(userId) {
  const KEY_HISTORY = 'stratos_history';
  const KEY_BADGES = 'stratos_badges';

  // Fetch cloud data
  const [cloudHistory, cloudBadges] = await Promise.all([
    fetchCloudHistory(userId),
    fetchCloudBadges(userId),
  ]);

  // Merge history: cloud wins on conflict (by timestamp+gameId dedup)
  let localHistory = [];
  try { localHistory = JSON.parse(localStorage.getItem(KEY_HISTORY) || '[]'); } catch {}
  const seen = new Set();
  const merged = [];
  for (const item of [...cloudHistory, ...localHistory]) {
    const key = `${item.gameId}_${item.timestamp}`;
    if (!seen.has(key)) { seen.add(key); merged.push(item); }
  }
  merged.sort((a, b) => b.timestamp - a.timestamp);
  localStorage.setItem(KEY_HISTORY, JSON.stringify(merged.slice(0, 500)));

  // Merge badges: union of cloud + local
  let localBadges = [];
  try { localBadges = JSON.parse(localStorage.getItem(KEY_BADGES) || '[]'); } catch {}
  const badgeMap = new Map();
  for (const b of [...localBadges, ...cloudBadges]) {
    if (!badgeMap.has(b.id) || b.earnedAt < badgeMap.get(b.id).earnedAt) {
      badgeMap.set(b.id, b);
    }
  }
  localStorage.setItem(KEY_BADGES, JSON.stringify([...badgeMap.values()]));

  return { historyCount: merged.length, badgeCount: badgeMap.size };
}

// ── Push all local data to cloud (on first sign-in) ─────────────────────────

export async function pushLocalToCloud(userId) {
  const KEY_HISTORY = 'stratos_history';
  const KEY_BADGES = 'stratos_badges';

  let localHistory = [];
  try { localHistory = JSON.parse(localStorage.getItem(KEY_HISTORY) || '[]'); } catch {}

  let localBadges = [];
  try { localBadges = JSON.parse(localStorage.getItem(KEY_BADGES) || '[]'); } catch {}

  // Push history in batches
  if (localHistory.length > 0) {
    const rows = localHistory.map(r => ({
      user_id: userId,
      game_id: r.gameId,
      game_name: r.gameName,
      won: r.won,
      moves: r.moves,
      difficulty: r.difficulty,
      played_at: new Date(r.timestamp).toISOString(),
    }));
    // Upsert in chunks of 100
    for (let i = 0; i < rows.length; i += 100) {
      const chunk = rows.slice(i, i + 100);
      await supabase.from('match_history').insert(chunk);
    }
  }

  // Push badges
  for (const b of localBadges) {
    await pushBadge(userId, b.id, b.earnedAt);
  }
}

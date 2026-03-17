const KEY_HISTORY = 'stratos_history';
const KEY_BADGES = 'stratos_badges';

// ── Elo rating system ───────────────────────────────────────────────────────
export const BASE_ELO = 500;
export const AI_RATINGS = { easy: 500, medium: 1000, hard: 1500 };
const K = 32; // standard K-factor

function opponentRating(difficulty) {
  return AI_RATINGS[difficulty] || AI_RATINGS.medium;
}

function expectedScore(playerElo, oppElo) {
  return 1 / (1 + Math.pow(10, (oppElo - playerElo) / 400));
}

// Compute current Elo from a list of games (oldest first)
export function computeElo(games) {
  let elo = BASE_ELO;
  for (const g of games) {
    const opp = opponentRating(g.difficulty);
    const expected = expectedScore(elo, opp);
    const actual = g.won ? 1 : 0;
    elo += K * (actual - expected);
  }
  return Math.round(elo);
}

// Compute full Elo history array (for charting): [startElo, afterGame1, afterGame2, ...]
export function computeEloHistory(games) {
  let elo = BASE_ELO;
  const points = [elo];
  for (const g of games) {
    const opp = opponentRating(g.difficulty);
    const expected = expectedScore(elo, opp);
    const actual = g.won ? 1 : 0;
    elo += K * (actual - expected);
    points.push(Math.round(elo));
  }
  return points;
}

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(KEY_HISTORY) || '[]'); } catch { return []; }
}

export function addResult(result) {
  // result: { gameId, gameName, won, moves, difficulty, timestamp, snapshots? }
  const history = getHistory();
  // Store snapshots separately to keep main history lightweight
  if (result.snapshots) {
    const key = `stratos_replay_${Date.now()}`;
    try { localStorage.setItem(key, JSON.stringify(result.snapshots)); } catch {}
    result = { ...result, replayKey: key };
    delete result.snapshots;
  }
  history.unshift(result);
  localStorage.setItem(KEY_HISTORY, JSON.stringify(history.slice(0, 500)));
  return history;
}

export function getReplay(replayKey) {
  if (!replayKey) return null;
  try { return JSON.parse(localStorage.getItem(replayKey) || 'null'); } catch { return null; }
}

export function getStats() {
  const history = getHistory();
  const totalGames = history.length;
  const totalWins = history.filter(g => g.won).length;
  const byGame = {};
  for (const g of history) {
    if (!byGame[g.gameId]) byGame[g.gameId] = { games: 0, wins: 0 };
    byGame[g.gameId].games++;
    if (g.won) byGame[g.gameId].wins++;
  }
  // Elo per game: proper Elo with AI opponent ratings
  for (const id of Object.keys(byGame)) {
    const gameHistory = history.filter(g => g.gameId === id);
    byGame[id].elo = computeElo([...gameHistory].reverse());
  }
  return { totalGames, totalWins, byGame };
}

export function getEarnedBadges() {
  try { return JSON.parse(localStorage.getItem(KEY_BADGES) || '[]'); } catch { return []; }
}

export function checkAndAwardBadges(allBadges) {
  const stats = getStats();
  const history = getHistory();
  const earned = getEarnedBadges();
  const earnedSet = new Set(earned.map(b => b.id));
  const newlyEarned = [];
  for (const badge of allBadges) {
    if (!earnedSet.has(badge.id) && badge.check(stats, history)) {
      const entry = { id: badge.id, earnedAt: Date.now() };
      earned.push(entry);
      newlyEarned.push(badge);
    }
  }
  if (newlyEarned.length > 0) {
    localStorage.setItem(KEY_BADGES, JSON.stringify(earned));
  }
  return newlyEarned;
}

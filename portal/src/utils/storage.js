const KEY_HISTORY = 'stratos_history';
const KEY_BADGES = 'stratos_badges';

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(KEY_HISTORY) || '[]'); } catch { return []; }
}

export function addResult(result) {
  // result: { gameId, gameName, won, moves, difficulty, timestamp }
  const history = getHistory();
  history.unshift(result);
  localStorage.setItem(KEY_HISTORY, JSON.stringify(history.slice(0, 500)));
  return history;
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
  // ELO per game: start 1200, win +25, loss -15
  for (const id of Object.keys(byGame)) {
    const gameHistory = history.filter(g => g.gameId === id);
    let elo = 1200;
    for (const g of [...gameHistory].reverse()) { // oldest first
      elo += g.won ? 25 : -15;
    }
    byGame[id].elo = Math.max(800, elo);
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

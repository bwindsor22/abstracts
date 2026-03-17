const ALL_GAMES = ['trees','circles','walls','bugs','stacks','towers','hexes','marbles','bridges','pairs','sowing','mills'];
const CLASSICS = ['hexes','marbles','bridges','pairs'];
const MODERNS = ['trees','circles','walls','bugs','stacks','towers'];

// Helper: count distinct games won on a given difficulty (or any)
function gamesWonOn(history, difficulty, gameList = ALL_GAMES) {
  return gameList.filter(id =>
    history.some(g => g.won && g.gameId === id && (!difficulty || g.difficulty === difficulty))
  );
}

export const ALL_BADGES = [
  // ── Variety ───────────────────────────────────────────────────────────────
  {
    id: 'first_game',
    name: 'First Move',
    description: 'Played your first game',
    icon: 'sports_esports',
    image: '/badges/first_move.png',
    rarity: 'COMMON',
    check: (stats) => stats.totalGames >= 1,
  },
  {
    id: 'first_win',
    name: 'First Victory',
    description: 'Won your first game',
    icon: 'emoji_events',
    image: '/badges/first_victory.png',
    rarity: 'COMMON',
    check: (stats) => stats.totalWins >= 1,
  },
  {
    id: 'polymath',
    name: 'Polymath',
    description: 'Won games in 3 different titles',
    icon: 'psychology',
    image: '/badges/polymath.png',
    rarity: 'UNCOMMON',
    check: (stats, history) => gamesWonOn(history).length >= 3,
  },
  {
    id: 'classic_explorer',
    name: 'Classic Explorer',
    description: 'Played every Timeless Classic game',
    icon: 'history_edu',
    image: '/badges/classic_explorer.png',
    rarity: 'UNCOMMON',
    check: (stats) => CLASSICS.every(id => (stats.byGame[id]?.games || 0) >= 1),
  },
  {
    id: 'modern_explorer',
    name: 'Modern Explorer',
    description: 'Played every Modern Marvels game',
    icon: 'explore',
    image: '/badges/modern_explorer.png',
    rarity: 'UNCOMMON',
    check: (stats) => MODERNS.every(id => (stats.byGame[id]?.games || 0) >= 1),
  },
  {
    id: 'full_collection',
    name: 'Full Collection',
    description: 'Played all 12 games at least once',
    icon: 'library_books',
    image: '/badges/full_collection.png',
    rarity: 'RARE',
    check: (stats) => ALL_GAMES.every(id => (stats.byGame[id]?.games || 0) >= 1),
  },
  {
    id: 'completionist',
    name: 'Completionist',
    description: 'Won at least one game in every title',
    icon: 'auto_awesome',
    image: '/badges/completionist.png',
    rarity: 'LEGENDARY',
    check: (stats, history) => gamesWonOn(history).length >= ALL_GAMES.length,
  },

  // ── Beating AI levels ─────────────────────────────────────────────────────
  {
    id: 'easy_first',
    name: 'Easy Win',
    description: 'Beat an easy AI',
    icon: 'sentiment_satisfied',
    image: '/badges/getting_started.png',
    rarity: 'COMMON',
    check: (stats, history) => history.some(g => g.won && g.difficulty === 'easy'),
  },
  {
    id: 'easy_five',
    name: 'Warming Up',
    description: 'Beat easy AI in 5 different games',
    icon: 'local_fire_department',
    image: '/badges/dedicated.png',
    rarity: 'UNCOMMON',
    check: (stats, history) => gamesWonOn(history, 'easy').length >= 5,
  },
  {
    id: 'easy_classics',
    name: 'Classic Conqueror',
    description: 'Beat every Timeless Classic on easy',
    icon: 'military_tech',
    image: '/badges/champion.png',
    rarity: 'RARE',
    check: (stats, history) => gamesWonOn(history, 'easy', CLASSICS).length >= CLASSICS.length,
  },
  {
    id: 'easy_all',
    name: 'Easy Sweep',
    description: 'Beat every game on easy',
    icon: 'workspace_premium',
    image: '/badges/veteran.png',
    rarity: 'EPIC',
    check: (stats, history) => gamesWonOn(history, 'easy').length >= ALL_GAMES.length,
  },
  {
    id: 'medium_first',
    name: 'Stepping Up',
    description: 'Beat a medium AI',
    icon: 'trending_up',
    image: '/badges/modern_specialist.png',
    rarity: 'RARE',
    check: (stats, history) => history.some(g => g.won && g.difficulty === 'medium'),
  },
  {
    id: 'hard_first',
    name: 'Grandmaster',
    description: 'Beat a hard AI',
    icon: 'crown',
    image: '/badges/grandmaster.png',
    rarity: 'EPIC',
    check: (stats, history) => history.some(g => g.won && g.difficulty === 'hard'),
  },
];

export const RARITY_COLORS = {
  COMMON:    '#8875b0',
  UNCOMMON:  '#4a9eff',
  RARE:      '#9942f0',
  EPIC:      '#e040fb',
  LEGENDARY: '#ffd700',
};

export const ALL_BADGES = [
  // ── Experience ─────────────────────────────────────────────────────────────
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
    id: 'five_games',
    name: 'Getting Started',
    description: 'Played 5 games',
    icon: 'star',
    image: '/badges/getting_started.png',
    rarity: 'COMMON',
    check: (stats) => stats.totalGames >= 5,
  },
  {
    id: 'twenty_games',
    name: 'Dedicated',
    description: 'Played 20 games',
    icon: 'local_fire_department',
    image: '/badges/dedicated.png',
    rarity: 'UNCOMMON',
    check: (stats) => stats.totalGames >= 20,
  },
  {
    id: 'modern_explorer',
    name: 'Modern Explorer',
    description: 'Played every Modern Marvels game',
    icon: 'explore',
    image: '/badges/modern_explorer.png',
    rarity: 'UNCOMMON',
    check: (stats) => ['trees','circles','walls','bugs','stacks','towers'].every(
      id => (stats.byGame[id]?.games || 0) >= 1
    ),
  },
  {
    id: 'classic_explorer',
    name: 'Classic Explorer',
    description: 'Played every Timeless Classic game',
    icon: 'history_edu',
    image: '/badges/classic_explorer.png',
    rarity: 'UNCOMMON',
    check: (stats) => ['hexes','marbles','bridges','stones'].every(
      id => (stats.byGame[id]?.games || 0) >= 1
    ),
  },
  {
    id: 'full_collection',
    name: 'Full Collection',
    description: 'Played all 10 games at least once',
    icon: 'library_books',
    image: '/badges/full_collection.png',
    rarity: 'RARE',
    check: (stats) => ['trees','circles','walls','bugs','stacks','towers','hexes','marbles','bridges','stones'].every(
      id => (stats.byGame[id]?.games || 0) >= 1
    ),
  },

  // ── Winning — general ──────────────────────────────────────────────────────
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
    id: 'five_wins',
    name: 'Champion',
    description: 'Won 5 games',
    icon: 'military_tech',
    image: '/badges/champion.png',
    rarity: 'UNCOMMON',
    check: (stats) => stats.totalWins >= 5,
  },
  {
    id: 'twenty_wins',
    name: 'Veteran',
    description: 'Won 20 games',
    icon: 'workspace_premium',
    image: '/badges/veteran.png',
    rarity: 'RARE',
    check: (stats) => stats.totalWins >= 20,
  },
  {
    id: 'polymath',
    name: 'Polymath',
    description: 'Won games in 3 different titles',
    icon: 'psychology',
    image: '/badges/polymath.png',
    rarity: 'RARE',
    check: (stats, history) => new Set(history.filter(g => g.won).map(g => g.gameId)).size >= 3,
  },
  {
    id: 'ten_wins',
    name: 'Grandmaster',
    description: 'Won 10 games total',
    icon: 'crown',
    image: '/badges/grandmaster.png',
    rarity: 'EPIC',
    check: (stats) => stats.totalWins >= 10,
  },

  // ── Milestone ──────────────────────────────────────────────────────────────
  {
    id: 'modern_specialist',
    name: 'Modern Specialist',
    description: 'Won any Modern Marvels game',
    icon: 'rocket_launch',
    image: '/badges/modern_specialist.png',
    rarity: 'RARE',
    check: (stats, history) => history.some(g => g.won && ['trees','circles','walls','bugs','stacks','towers'].includes(g.gameId)),
  },
  {
    id: 'completionist',
    name: 'Completionist',
    description: 'Won at least one game in every title',
    icon: 'auto_awesome',
    image: '/badges/completionist.png',
    rarity: 'LEGENDARY',
    check: (stats, history) => ['trees','circles','walls','bugs','stacks','towers','hexes','marbles','bridges','stones'].every(id =>
      history.some(g => g.won && g.gameId === id)
    ),
  },
];

export const RARITY_COLORS = {
  COMMON:    '#8875b0',
  UNCOMMON:  '#4a9eff',
  RARE:      '#9942f0',
  EPIC:      '#e040fb',
  LEGENDARY: '#ffd700',
};

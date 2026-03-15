export const ALL_BADGES = [
  // ── Participation ──────────────────────────────────────────────────────────
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
    rarity: 'EPIC',
    check: (stats) => stats.totalWins >= 10,
  },

  // ── Classic — Easy ─────────────────────────────────────────────────────────
  {
    id: 'hex_novice',
    name: 'Hex Novice',
    description: 'Won Hexes on Easy',
    icon: 'grid_view',
    rarity: 'COMMON',
    check: (stats, history) => history.some(g => g.won && g.gameId === 'hexes' && g.difficulty === 'easy'),
  },
  {
    id: 'marble_novice',
    name: 'Marble Novice',
    description: 'Won Marbles on Easy',
    icon: 'bubble_chart',
    rarity: 'COMMON',
    check: (stats, history) => history.some(g => g.won && g.gameId === 'marbles' && g.difficulty === 'easy'),
  },
  {
    id: 'bridge_novice',
    name: 'Bridge Novice',
    description: 'Won Bridges on Easy',
    icon: 'bridge',
    rarity: 'COMMON',
    check: (stats, history) => history.some(g => g.won && g.gameId === 'bridges' && g.difficulty === 'easy'),
  },
  {
    id: 'stone_novice',
    name: 'Stone Novice',
    description: 'Won Stones on Easy',
    icon: 'diamond',
    rarity: 'COMMON',
    check: (stats, history) => history.some(g => g.won && g.gameId === 'stones' && g.difficulty === 'easy'),
  },

  // ── Classic — Medium ───────────────────────────────────────────────────────
  {
    id: 'hex_adept',
    name: 'Hex Adept',
    description: 'Won Hexes on Medium',
    icon: 'grid_view',
    rarity: 'UNCOMMON',
    check: (stats, history) => history.some(g => g.won && g.gameId === 'hexes' && g.difficulty === 'medium'),
  },
  {
    id: 'marble_adept',
    name: 'Marble Adept',
    description: 'Won Marbles on Medium',
    icon: 'bubble_chart',
    rarity: 'UNCOMMON',
    check: (stats, history) => history.some(g => g.won && g.gameId === 'marbles' && g.difficulty === 'medium'),
  },
  {
    id: 'bridge_adept',
    name: 'Bridge Adept',
    description: 'Won Bridges on Medium',
    icon: 'bridge',
    rarity: 'UNCOMMON',
    check: (stats, history) => history.some(g => g.won && g.gameId === 'bridges' && g.difficulty === 'medium'),
  },
  {
    id: 'stone_adept',
    name: 'Stone Adept',
    description: 'Won Stones on Medium',
    icon: 'diamond',
    rarity: 'UNCOMMON',
    check: (stats, history) => history.some(g => g.won && g.gameId === 'stones' && g.difficulty === 'medium'),
  },

  // ── Milestone ──────────────────────────────────────────────────────────────
  {
    id: 'classic_master',
    name: 'Classic Master',
    description: 'Won all 4 Classics on Medium',
    icon: 'verified',
    rarity: 'EPIC',
    check: (stats, history) => ['hexes','marbles','bridges','stones'].every(id =>
      history.some(g => g.won && g.gameId === id && g.difficulty === 'medium')
    ),
  },
  {
    id: 'modern_specialist',
    name: 'Modern Specialist',
    description: 'Won any Modern Marvels game',
    icon: 'rocket_launch',
    rarity: 'RARE',
    check: (stats, history) => history.some(g => g.won && ['trees','circles','walls','bugs','stacks','towers'].includes(g.gameId)),
  },
  {
    id: 'completionist',
    name: 'Completionist',
    description: 'Won at least one game in every title',
    icon: 'auto_awesome',
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

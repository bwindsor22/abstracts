// icon: Material Symbols Outlined ligature names (loaded via Google Fonts in index.html)
// complexity: low = learn in 1 min, medium = a few rules to grasp, high = multiple systems to learn
export const GAMES = [
  // Modern Marvels
  { id: 'trees',   name: 'Trees',   realName: 'Photosynthesis', subtitle: 'Arboreal Logic',     icon: 'forest',               port: 3009, category: 'modern',  complexity: 'high' },
  { id: 'circles', name: 'Circles', realName: 'YINSH',          subtitle: 'Infinite Loop',      icon: 'radio_button_checked',  port: 3003, category: 'modern',  complexity: 'high' },
  { id: 'walls',   name: 'Walls',   realName: 'Quoridor',       subtitle: 'Defensive Stance',   icon: 'view_kanban',           port: 3010, category: 'modern',  complexity: 'low' },
  { id: 'bugs',    name: 'Bugs',    realName: 'Hive',            subtitle: 'Swarm Tactics',      icon: 'bug_report',            port: 3002, category: 'modern',  complexity: 'high' },
  { id: 'stacks',  name: 'Stacks',  realName: 'Tak',             subtitle: 'Vertical Advantage', icon: 'layers',                port: 3006, category: 'modern',  complexity: 'high' },
  { id: 'towers',  name: 'Towers',  realName: 'Santorini',       subtitle: 'High Command',       icon: 'domain',                port: 3008, category: 'modern',  complexity: 'medium' },
  { id: 'blocks',  name: 'Blocks',  realName: 'Blokus',          subtitle: 'Territory Tiles',    icon: 'apps',                  port: 3013, category: 'modern',  complexity: 'low' },
  // Timeless Classics
  { id: 'hexes',   name: 'Hexes',   realName: 'Hex',             subtitle: 'Six Sided War',      icon: 'grid_view',             port: 3004, category: 'classic', complexity: 'low' },
  { id: 'marbles', name: 'Marbles', realName: 'Abalone',         subtitle: 'Rolling Velocity',   icon: 'bubble_chart',          port: 3005, category: 'classic', complexity: 'medium' },
  { id: 'bridges', name: 'Bridges', realName: 'TwixT',           subtitle: 'Connector Strategy', icon: 'share',                port: 3001, category: 'classic', complexity: 'low' },
  { id: 'pairs',   name: 'Pairs',   realName: 'Pente',           subtitle: 'Ancient Grounding',  icon: 'toll',               port: 3007, category: 'classic', complexity: 'low' },
  // Heritage Games
  { id: 'fives',   name: 'Fives',   realName: 'Gomoku',          subtitle: 'Line of Victory',    icon: 'grid_on',               port: 3014, category: 'heritage', complexity: 'low' },
  { id: 'omweso',  name: 'Loops',   realName: 'Omweso',          subtitle: 'Royal Strategy',     icon: 'all_inclusive',              port: 3016, category: 'heritage', complexity: 'medium' },
  { id: 'flips',   name: 'Flips',   realName: 'Othello',         subtitle: 'Outflank & Conquer', icon: 'contrast',              port: 3015, category: 'heritage', complexity: 'low' },
  // Ancient Foundations
  { id: 'sowing',  name: 'Sowing',  realName: 'Oware',           subtitle: 'Seed & Harvest',     icon: 'grain',                 port: 3011, category: 'ancient', complexity: 'low' },
  { id: 'mills',   name: 'Mills',   realName: 'Nine Men\'s Morris', subtitle: 'Trap & Capture',  icon: 'token',                 port: 3012, category: 'ancient', complexity: 'low' },
];

export const GAME_MAP = Object.fromEntries(GAMES.map(g => [g.id, g]));

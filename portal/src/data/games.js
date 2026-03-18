// icon: Material Symbols Outlined ligature names (loaded via Google Fonts in index.html)
// complexity: low = learn in 1 min, medium = a few rules to grasp, high = multiple systems to learn
export const GAMES = [
  // Modern Marvels
  { id: 'trees',   name: 'Trees',   subtitle: 'Arboreal Logic',     icon: 'forest',               port: 3009, category: 'modern',  complexity: 'high' },
  { id: 'circles', name: 'Circles', subtitle: 'Infinite Loop',      icon: 'radio_button_checked',  port: 3003, category: 'modern',  complexity: 'high' },
  { id: 'walls',   name: 'Walls',   subtitle: 'Defensive Stance',   icon: 'view_kanban',           port: 3010, category: 'modern',  complexity: 'medium' },
  { id: 'bugs',    name: 'Bugs',    subtitle: 'Swarm Tactics',      icon: 'bug_report',            port: 3002, category: 'modern',  complexity: 'high' },
  { id: 'stacks',  name: 'Stacks',  subtitle: 'Vertical Advantage', icon: 'layers',                port: 3006, category: 'modern',  complexity: 'high' },
  { id: 'towers',  name: 'Towers',  subtitle: 'High Command',       icon: 'domain',                port: 3008, category: 'modern',  complexity: 'medium' },
  // Timeless Classics
  { id: 'hexes',   name: 'Hexes',   subtitle: 'Six Sided War',      icon: 'grid_view',             port: 3004, category: 'classic', complexity: 'low' },
  { id: 'marbles', name: 'Marbles', subtitle: 'Rolling Velocity',   icon: 'bubble_chart',          port: 3005, category: 'classic', complexity: 'medium' },
  { id: 'bridges', name: 'Bridges', subtitle: 'Connector Strategy', icon: 'share',                port: 3001, category: 'classic', complexity: 'low' },
  { id: 'pairs',   name: 'Pairs',   subtitle: 'Ancient Grounding',  icon: 'diamond',               port: 3007, category: 'classic', complexity: 'low' },
  // Ancient Foundations
  { id: 'sowing',  name: 'Sowing',  subtitle: 'Seed & Harvest',     icon: 'grain',                 port: 3011, category: 'ancient', complexity: 'low' },
  { id: 'mills',   name: 'Mills',   subtitle: 'Trap & Capture',     icon: 'token',                 port: 3012, category: 'ancient', complexity: 'low' },
];

export const GAME_MAP = Object.fromEntries(GAMES.map(g => [g.id, g]));

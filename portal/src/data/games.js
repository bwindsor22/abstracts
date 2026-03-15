// icon: Material Symbols Outlined ligature names (loaded via Google Fonts in index.html)
export const GAMES = [
  // Modern Marvels
  { id: 'trees',   name: 'Trees',   subtitle: 'Arboreal Logic',     icon: 'forest',               port: 3009, category: 'modern' },
  { id: 'circles', name: 'Circles', subtitle: 'Infinite Loop',      icon: 'radio_button_checked',  port: 3003, category: 'modern' },
  { id: 'walls',   name: 'Walls',   subtitle: 'Defensive Stance',   icon: 'view_kanban',           port: 3010, category: 'modern' },
  { id: 'bugs',    name: 'Bugs',    subtitle: 'Swarm Tactics',      icon: 'bug_report',            port: 3002, category: 'modern' },
  { id: 'stacks',  name: 'Stacks',  subtitle: 'Vertical Advantage', icon: 'layers',                port: 3006, category: 'modern' },
  { id: 'towers',  name: 'Towers',  subtitle: 'High Command',       icon: 'domain',                port: 3008, category: 'modern' },
  // Timeless Classics
  { id: 'hexes',   name: 'Hexes',   subtitle: 'Six Sided War',      icon: 'grid_view',             port: 3004, category: 'classic' },
  { id: 'marbles', name: 'Marbles', subtitle: 'Rolling Velocity',   icon: 'bubble_chart',          port: 3005, category: 'classic' },
  { id: 'bridges', name: 'Bridges', subtitle: 'Connector Strategy', icon: 'bridge',                port: 3001, category: 'classic' },
  { id: 'stones',  name: 'Stones',  subtitle: 'Ancient Grounding',  icon: 'diamond',               port: 3007, category: 'classic' },
];

export const GAME_MAP = Object.fromEntries(GAMES.map(g => [g.id, g]));

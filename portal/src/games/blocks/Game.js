// Game.js — Blokus core logic (pure, no React)
// 20×20 grid, 4 colors, 21 polyomino pieces each.
// Two-player: human (blue+red) vs AI (yellow+green).

export const SIZE = 20;
export const COLORS = ['blue', 'yellow', 'red', 'green'];
export const CORNERS = {
  blue:   [0, 0],
  yellow: [0, SIZE - 1],
  red:    [SIZE - 1, SIZE - 1],
  green:  [SIZE - 1, 0],
};
// Human controls blue+red, AI controls yellow+green
export const HUMAN_COLORS = ['blue', 'red'];
export const AI_COLORS = ['yellow', 'green'];

// ── Piece definitions ────────────────────────────────────────────────────────
// Each piece is an array of [row, col] offsets from (0,0).
// Canonical orientation — rotations/flips are computed at runtime.
const RAW_PIECES = {
  // 1-square
  '1':  [[0,0]],
  // 2-square
  '2':  [[0,0],[0,1]],
  // 3-square
  'I3': [[0,0],[0,1],[0,2]],
  'L3': [[0,0],[1,0],[1,1]],
  // 4-square
  'I4': [[0,0],[0,1],[0,2],[0,3]],
  'O4': [[0,0],[0,1],[1,0],[1,1]],
  'T4': [[0,0],[0,1],[0,2],[1,1]],
  'S4': [[0,0],[0,1],[1,1],[1,2]],
  'L4': [[0,0],[1,0],[2,0],[2,1]],
  // 5-square
  'F5': [[0,1],[1,0],[1,1],[1,2],[2,0]],
  'I5': [[0,0],[0,1],[0,2],[0,3],[0,4]],
  'L5': [[0,0],[1,0],[2,0],[3,0],[3,1]],
  'N5': [[0,0],[0,1],[1,1],[1,2],[1,3]],
  'P5': [[0,0],[0,1],[1,0],[1,1],[2,0]],
  'T5': [[0,0],[0,1],[0,2],[1,1],[2,1]],
  'U5': [[0,0],[0,2],[1,0],[1,1],[1,2]],
  'V5': [[0,0],[1,0],[2,0],[2,1],[2,2]],
  'W5': [[0,0],[1,0],[1,1],[2,1],[2,2]],
  'X5': [[0,1],[1,0],[1,1],[1,2],[2,1]],
  'Y5': [[0,0],[1,0],[1,1],[2,0],[3,0]],
  'Z5': [[0,0],[0,1],[1,1],[2,1],[2,2]],
};

// Number of squares per piece (for scoring)
export const PIECE_SIZES = {};
for (const [id, cells] of Object.entries(RAW_PIECES)) {
  PIECE_SIZES[id] = cells.length;
}

// ── Rotation / flip helpers ──────────────────────────────────────────────────

function normalize(cells) {
  const minR = Math.min(...cells.map(c => c[0]));
  const minC = Math.min(...cells.map(c => c[1]));
  const shifted = cells.map(([r, c]) => [r - minR, c - minC]);
  shifted.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return shifted;
}

function rotate90(cells) {
  return normalize(cells.map(([r, c]) => [c, -r]));
}

function flip(cells) {
  return normalize(cells.map(([r, c]) => [r, -c]));
}

function cellsKey(cells) {
  return cells.map(([r, c]) => `${r},${c}`).join('|');
}

// Generate all unique orientations (up to 8: 4 rotations × 2 flips)
function allOrientations(cells) {
  const seen = new Set();
  const result = [];
  let current = normalize(cells);
  for (let f = 0; f < 2; f++) {
    for (let r = 0; r < 4; r++) {
      const k = cellsKey(current);
      if (!seen.has(k)) {
        seen.add(k);
        result.push(current);
      }
      current = rotate90(current);
    }
    current = flip(normalize(cells));
  }
  return result;
}

// Pre-compute all orientations for all pieces
export const PIECE_ORIENTATIONS = {};
for (const [id, cells] of Object.entries(RAW_PIECES)) {
  PIECE_ORIENTATIONS[id] = allOrientations(cells);
}

export const PIECE_IDS = Object.keys(RAW_PIECES);

// ── State management ─────────────────────────────────────────────────────────

export function initState({ vsAI = true, difficulty = 'medium' } = {}) {
  // board[r][c] = null | 'blue' | 'yellow' | 'red' | 'green'
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  const hands = {};
  for (const color of COLORS) {
    hands[color] = new Set(PIECE_IDS);
  }
  return {
    board,
    hands,
    currentColor: 'blue', // turn order: blue → yellow → red → green
    turnIndex: 0,
    passed: { blue: false, yellow: false, red: false, green: false },
    winner: null,
    vsAI,
    difficulty,
  };
}

// ── Placement validation ─────────────────────────────────────────────────────

function inBounds(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

const EDGE_DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
const DIAG_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

export function canPlace(board, color, cells, row, col, isFirstMove) {
  const placed = [];
  for (const [dr, dc] of cells) {
    const r = row + dr, c = col + dc;
    if (!inBounds(r, c)) return false;
    if (board[r][c] !== null) return false;
    placed.push([r, c]);
  }

  // No edge-adjacent same-color
  for (const [r, c] of placed) {
    for (const [dr, dc] of EDGE_DIRS) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] === color) return false;
    }
  }

  if (isFirstMove) {
    // Must cover the corner
    const [cr, cc] = CORNERS[color];
    return placed.some(([r, c]) => r === cr && c === cc);
  }

  // Must be diagonal-adjacent to at least one same-color piece
  for (const [r, c] of placed) {
    for (const [dr, dc] of DIAG_DIRS) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] === color) return true;
    }
  }
  return false;
}

// ── Get all valid moves for a color ──────────────────────────────────────────

export function getAllMoves(state, color) {
  const { board, hands } = state;
  const pieces = hands[color];
  if (!pieces || pieces.size === 0) return [];

  const isFirst = !board.some(row => row.some(cell => cell === color));
  const moves = [];

  // Find candidate positions: cells diagonal to existing same-color pieces
  const candidates = new Set();
  if (isFirst) {
    const [cr, cc] = CORNERS[color];
    // Any cell that could cover the corner — check in a bounding box
    for (let r = cr - 4; r <= cr + 4; r++) {
      for (let c = cc - 4; c <= cc + 4; c++) {
        if (inBounds(r, c)) candidates.add(r * SIZE + c);
      }
    }
  } else {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === color) {
          for (const [dr, dc] of DIAG_DIRS) {
            const nr = r + dr, nc = c + dc;
            if (inBounds(nr, nc) && board[nr][nc] === null) {
              // Expand around this diagonal cell
              for (let pr = nr - 4; pr <= nr + 4; pr++) {
                for (let pc = nc - 4; pc <= nc + 4; pc++) {
                  if (inBounds(pr, pc)) candidates.add(pr * SIZE + pc);
                }
              }
            }
          }
        }
      }
    }
  }

  const candidatePositions = [...candidates].map(v => [Math.floor(v / SIZE), v % SIZE]);

  for (const pieceId of pieces) {
    const orientations = PIECE_ORIENTATIONS[pieceId];
    for (let oi = 0; oi < orientations.length; oi++) {
      const cells = orientations[oi];
      for (const [row, col] of candidatePositions) {
        if (canPlace(board, color, cells, row, col, isFirst)) {
          moves.push({ pieceId, orientation: oi, row, col });
        }
      }
    }
  }

  return moves;
}

// ── Apply move ───────────────────────────────────────────────────────────────

export function applyMove(state, color, move) {
  const { pieceId, orientation, row, col } = move;
  const cells = PIECE_ORIENTATIONS[pieceId][orientation];

  const board = state.board.map(r => [...r]);
  for (const [dr, dc] of cells) {
    board[row + dr][col + dc] = color;
  }

  const hands = {};
  for (const c of COLORS) {
    hands[c] = new Set(state.hands[c]);
  }
  hands[color].delete(pieceId);

  // Advance to next color, skip passed colors
  let nextIndex = (state.turnIndex + 1) % 4;
  const passed = { ...state.passed, [color]: false };

  // Check which colors can still play
  for (let i = 0; i < 4; i++) {
    const ci = (state.turnIndex + 1 + i) % 4;
    const nextColor = COLORS[ci];
    if (passed[nextColor]) continue;
    const nextMoves = getAllMoves({ ...state, board, hands }, nextColor);
    if (nextMoves.length === 0) {
      passed[nextColor] = true;
      continue;
    }
    nextIndex = ci;
    break;
  }

  // Check if game is over (all colors passed)
  const allPassed = COLORS.every(c => passed[c]);
  let winner = null;
  if (allPassed) {
    winner = computeWinner(hands);
  }

  return {
    ...state,
    board,
    hands,
    currentColor: COLORS[nextIndex],
    turnIndex: nextIndex,
    passed,
    winner,
  };
}

// ── Scoring ──────────────────────────────────────────────────────────────────

export function getScore(hands, colors) {
  let total = 0;
  for (const color of colors) {
    let remaining = 0;
    for (const pid of hands[color]) {
      remaining += PIECE_SIZES[pid];
    }
    if (remaining === 0) {
      total += 15; // bonus for placing all pieces
      // Note: tracking last-piece-was-monomino would require move history; skip for now
    } else {
      total -= remaining;
    }
  }
  return total;
}

function computeWinner(hands) {
  const humanScore = getScore(hands, HUMAN_COLORS);
  const aiScore = getScore(hands, AI_COLORS);
  if (humanScore > aiScore) return 'human';
  if (aiScore > humanScore) return 'ai';
  return 'draw';
}

// ── Evaluation for AI ────────────────────────────────────────────────────────

export function evaluate(state, isAI) {
  const aiColors = AI_COLORS;
  const humanColors = HUMAN_COLORS;

  if (state.winner === 'ai') return isAI ? 100000 : -100000;
  if (state.winner === 'human') return isAI ? -100000 : 100000;
  if (state.winner === 'draw') return 0;

  // Heuristic: squares placed minus opponent squares placed
  let aiSquares = 0, humanSquares = 0;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (aiColors.includes(state.board[r][c])) aiSquares++;
      if (humanColors.includes(state.board[r][c])) humanSquares++;
    }
  }

  const score = aiSquares - humanSquares;
  return isAI ? score : -score;
}

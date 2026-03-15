// Game.js — Hex board game core logic (pure, no React)
// Red connects top→bottom, Blue connects left→right
// Board: SIZE×SIZE rhombus, axial-style addressed as board[row][col]

export const SIZE = 11;

// 6 hex neighbours for (row, col)
export const NEIGHBOURS = [
  [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0],
];

export function initState({ vsAI = false, aiPlayer = 'blue', difficulty = 'medium' } = {}) {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null)); // null | 'red' | 'blue'
  return {
    board,
    currentPlayer: 'red',   // red goes first
    winner: null,
    moveCount: 0,
    vsAI, aiPlayer, difficulty,
  };
}

export function inBounds(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

export function applyMove(state, row, col) {
  if (state.winner || state.board[row][col]) return state;
  const board = state.board.map(r => [...r]);
  board[row][col] = state.currentPlayer;
  const winner = detectWin(board, state.currentPlayer, row, col);
  const next = state.currentPlayer === 'red' ? 'blue' : 'red';
  return { ...state, board, currentPlayer: winner ? state.currentPlayer : next, winner, moveCount: state.moveCount + 1 };
}

// Swap rule: after the first stone is placed (moveCount === 1), the second player
// may invoke the swap — they take ownership of the first stone, which moves to the
// mirrored position on the board (row and col swapped), and changes to their color.
export function applySwap(state) {
  if (state.moveCount !== 1) return state; // only valid on move 2
  // Find the one stone on the board
  let stoneRow = -1, stoneCol = -1;
  outer: for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (state.board[r][c] === 'red') { stoneRow = r; stoneCol = c; break outer; }
    }
  }
  if (stoneRow === -1) return state;
  // Mirror: swap row and col indices
  const mirrorRow = stoneCol;
  const mirrorCol = stoneRow;
  const board = state.board.map(r => [...r]);
  board[stoneRow][stoneCol] = null;
  board[mirrorRow][mirrorCol] = 'blue'; // second player is blue, takes ownership
  // Blue has just "played" their turn via swap; now red goes
  return { ...state, board, currentPlayer: 'red', moveCount: state.moveCount + 1 };
}

// BFS win detection — checks if player has a continuous path across
function detectWin(board, player, lastRow, lastCol) {
  // Red: top (row 0) → bottom (row SIZE-1)
  // Blue: left (col 0) → right (col SIZE-1)
  const startCheck = player === 'red'
    ? (r, c) => r === 0
    : (r, c) => c === 0;
  const endCheck = player === 'red'
    ? (r, c) => r === SIZE - 1
    : (r, c) => c === SIZE - 1;

  // Only check if last move is on starting edge
  const lr = lastRow, lc = lastCol;
  if (!startCheck(lr, lc) && !endCheck(lr, lc)) {
    // Still need full BFS in case it completed via existing chain
    // But optimise: only run if last placed piece could be in path
  }

  // BFS from all starting-edge cells of player
  const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const queue = [];
  for (let i = 0; i < SIZE; i++) {
    const [r, c] = player === 'red' ? [0, i] : [i, 0];
    if (board[r][c] === player) {
      queue.push([r, c]);
      visited[r][c] = true;
    }
  }
  while (queue.length > 0) {
    const [r, c] = queue.shift();
    if (endCheck(r, c)) return player;
    for (const [dr, dc] of NEIGHBOURS) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && !visited[nr][nc] && board[nr][nc] === player) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
      }
    }
  }
  return null;
}

// ─── Heuristic: shortest virtual path ────────────────────────────────────────
// Dijkstra-like: cells owned by player cost 0, empty cost 1, opponent = Infinity
export function shortestPath(board, player) {
  const opp = player === 'red' ? 'blue' : 'red';
  const dist = Array.from({ length: SIZE }, () => Array(SIZE).fill(Infinity));
  // Min-heap via sorted array (small board, ok)
  const heap = [];

  // Starting edge
  for (let i = 0; i < SIZE; i++) {
    const [r, c] = player === 'red' ? [0, i] : [i, 0];
    if (board[r][c] === opp) continue;
    const cost = board[r][c] === player ? 0 : 1;
    if (cost < dist[r][c]) { dist[r][c] = cost; heap.push([cost, r, c]); }
  }
  heap.sort((a, b) => a[0] - b[0]);

  while (heap.length > 0) {
    const [d, r, c] = heap.shift();
    if (d > dist[r][c]) continue;
    for (const [dr, dc] of NEIGHBOURS) {
      const nr = r + dr, nc = c + dc;
      if (!inBounds(nr, nc) || board[nr][nc] === opp) continue;
      const cost = board[nr][nc] === player ? 0 : 1;
      const nd = d + cost;
      if (nd < dist[nr][nc]) {
        dist[nr][nc] = nd;
        heap.push([nd, nr, nc]);
        heap.sort((a, b) => a[0] - b[0]);
      }
    }
  }

  // Min over ending edge
  let best = Infinity;
  for (let i = 0; i < SIZE; i++) {
    const [r, c] = player === 'red' ? [SIZE - 1, i] : [i, SIZE - 1];
    if (dist[r][c] < best) best = dist[r][c];
  }
  return best;
}

export function evaluate(board, player) {
  if (!board) return 0;
  const opp = player === 'red' ? 'blue' : 'red';
  const myPath = shortestPath(board, player);
  const oppPath = shortestPath(board, opp);
  if (myPath === 0) return 100000;
  if (oppPath === 0) return -100000;
  return oppPath - myPath;
}

export function getAllMoves(board) {
  const moves = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (!board[r][c]) moves.push([r, c]);
  return moves;
}

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

// ─── Binary min-heap for Dijkstra ────────────────────────────────────────────
class MinHeap {
  constructor() { this.data = []; }
  push(item) {
    this.data.push(item);
    let i = this.data.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p][0] <= this.data[i][0]) break;
      [this.data[p], this.data[i]] = [this.data[i], this.data[p]];
      i = p;
    }
  }
  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      let i = 0;
      while (true) {
        let s = i, l = 2 * i + 1, r = 2 * i + 2;
        if (l < this.data.length && this.data[l][0] < this.data[s][0]) s = l;
        if (r < this.data.length && this.data[r][0] < this.data[s][0]) s = r;
        if (s === i) break;
        [this.data[s], this.data[i]] = [this.data[i], this.data[s]];
        i = s;
      }
    }
    return top;
  }
  get size() { return this.data.length; }
}

// ─── Heuristic: shortest virtual path ────────────────────────────────────────
// Dijkstra: cells owned by player cost 0, empty cost 1, opponent = wall
export function shortestPath(board, player) {
  const opp = player === 'red' ? 'blue' : 'red';
  const dist = Array.from({ length: SIZE }, () => Array(SIZE).fill(Infinity));
  const heap = new MinHeap();

  // Starting edge
  for (let i = 0; i < SIZE; i++) {
    const [r, c] = player === 'red' ? [0, i] : [i, 0];
    if (board[r][c] === opp) continue;
    const cost = board[r][c] === player ? 0 : 1;
    if (cost < dist[r][c]) { dist[r][c] = cost; heap.push([cost, r, c]); }
  }

  while (heap.size > 0) {
    const [d, r, c] = heap.pop();
    if (d > dist[r][c]) continue;
    // Check end condition early
    if (player === 'red' ? r === SIZE - 1 : c === SIZE - 1) return d;
    for (const [dr, dc] of NEIGHBOURS) {
      const nr = r + dr, nc = c + dc;
      if (!inBounds(nr, nc) || board[nr][nc] === opp) continue;
      const cost = board[nr][nc] === player ? 0 : 1;
      const nd = d + cost;
      if (nd < dist[nr][nc]) {
        dist[nr][nc] = nd;
        heap.push([nd, nr, nc]);
      }
    }
  }

  return Infinity;
}

// ─── Two-distance: cost allowing bridge/virtual connections ──────────────────
// Like shortestPath but also considers "bridge" patterns (two-step connections)
// where two friendly cells share two common empty neighbours — these act as
// virtual connections that cost 0 instead of 1 per step.
// BRIDGE_PAIRS: pairs of offsets that form a bridge in hex geometry
const BRIDGE_PAIRS = [
  [[-1, 0], [-1, 1]],   // top-left bridge
  [[-1, 1], [0, 1]],    // top-right bridge
  [[0, 1], [1, 0]],     // right bridge
  [[1, 0], [1, -1]],    // bottom-right bridge
  [[1, -1], [0, -1]],   // bottom-left bridge
  [[0, -1], [-1, 0]],   // left bridge
];

// Extended neighbours: direct neighbours (cost depends on occupancy) +
// bridge destinations (cost 0 if bridge pattern holds for player)
export function shortestPathWithBridges(board, player) {
  const opp = player === 'red' ? 'blue' : 'red';
  const dist = Array.from({ length: SIZE }, () => Array(SIZE).fill(Infinity));
  const heap = new MinHeap();

  for (let i = 0; i < SIZE; i++) {
    const [r, c] = player === 'red' ? [0, i] : [i, 0];
    if (board[r][c] === opp) continue;
    const cost = board[r][c] === player ? 0 : 1;
    if (cost < dist[r][c]) { dist[r][c] = cost; heap.push([cost, r, c]); }
  }

  while (heap.size > 0) {
    const [d, r, c] = heap.pop();
    if (d > dist[r][c]) continue;
    if (player === 'red' ? r === SIZE - 1 : c === SIZE - 1) return d;

    // Direct neighbours
    for (const [dr, dc] of NEIGHBOURS) {
      const nr = r + dr, nc = c + dc;
      if (!inBounds(nr, nc) || board[nr][nc] === opp) continue;
      const cost = board[nr][nc] === player ? 0 : 1;
      const nd = d + cost;
      if (nd < dist[nr][nc]) { dist[nr][nc] = nd; heap.push([nd, nr, nc]); }
    }

    // Bridge connections: if current cell is owned by player, check bridge jumps
    if (board[r][c] === player) {
      for (const [off1, off2] of BRIDGE_PAIRS) {
        // The bridge endpoint is at off1+off2 relative to [r,c]
        const br = r + off1[0] + off2[0], bc = c + off1[1] + off2[1];
        if (!inBounds(br, bc)) continue;
        if (board[br][bc] !== player) continue; // endpoint must be ours
        // The two "bridge carrier" cells must both be empty (not opponent)
        const c1r = r + off1[0], c1c = c + off1[1];
        const c2r = r + off2[0], c2c = c + off2[1];
        if (!inBounds(c1r, c1c) || !inBounds(c2r, c2c)) continue;
        if (board[c1r][c1c] === opp && board[c2r][c2c] === opp) continue;
        // Virtual connection — cost 0 to reach br,bc
        if (d < dist[br][bc]) { dist[br][bc] = d; heap.push([d, br, bc]); }
      }
    }
  }

  return Infinity;
}

// ─── Evaluate: basic (for medium) and advanced (for hard) ────────────────────
export function evaluate(board, player) {
  if (!board) return 0;
  const opp = player === 'red' ? 'blue' : 'red';
  const myPath = shortestPath(board, player);
  const oppPath = shortestPath(board, opp);
  if (myPath === 0) return 100000;
  if (oppPath === 0) return -100000;
  return oppPath - myPath;
}

// Advanced evaluation with bridge-aware two-distance + connectivity bonus
export function evaluateAdvanced(board, player) {
  if (!board) return 0;
  const opp = player === 'red' ? 'blue' : 'red';

  // Primary: shortest path (standard)
  const myPath = shortestPath(board, player);
  const oppPath = shortestPath(board, opp);
  if (myPath === 0) return 100000;
  if (oppPath === 0) return -100000;

  // Secondary: bridge-aware two-distance
  const myBridge = shortestPathWithBridges(board, player);
  const oppBridge = shortestPathWithBridges(board, opp);

  // Connectivity: count cells connected to both edges (strong positions)
  const myConn = countConnectedCells(board, player);
  const oppConn = countConnectedCells(board, opp);

  // Weighted combination:
  // - Two-distance difference is primary (×4) — drives strategic play
  // - Standard path difference (×2) — tactical accuracy
  // - Bridge path difference (×1.5) — rewards virtual connections
  // - Connectivity bonus (×0.3) — slight reward for well-connected stones
  return (oppPath - myPath) * 2
       + (oppBridge - myBridge) * 1.5
       + (oppConn - myConn) * -0.3;
}

// Count cells of player that are on the shortest path (connected to start edge)
function countConnectedCells(board, player) {
  const opp = player === 'red' ? 'blue' : 'red';
  const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
  const queue = [];
  // BFS from starting edge
  for (let i = 0; i < SIZE; i++) {
    const [r, c] = player === 'red' ? [0, i] : [i, 0];
    if (board[r][c] === player && !visited[r][c]) {
      visited[r][c] = true;
      queue.push([r, c]);
    }
  }
  let count = queue.length;
  while (queue.length > 0) {
    const [r, c] = queue.shift();
    for (const [dr, dc] of NEIGHBOURS) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && !visited[nr][nc] && board[nr][nc] === player) {
        visited[nr][nc] = true;
        queue.push([nr, nc]);
        count++;
      }
    }
  }
  return count;
}

export function getAllMoves(board) {
  const moves = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (!board[r][c]) moves.push([r, c]);
  return moves;
}

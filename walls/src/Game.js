// Game.js — Quoridor core logic (pure, no React)
// 9×9 grid. Reach the opposite row to win. Place walls to impede.

export const SIZE = 9;
export const MAX_WALLS = 10; // walls per player

// ─── State ───────────────────────────────────────────────────────────────────
export function initState({ vsAI = false, aiPlayer = 'p2', difficulty = 'medium' } = {}) {
  return {
    // Pawns: row/col (0-indexed, row 0 = top)
    pawns: { p1: { row: 0, col: 4 }, p2: { row: 8, col: 4 } },
    walls: {
      // 'r,c,h' = horizontal wall at top of rows r,r+1 spanning cols c,c+1
      // 'r,c,v' = vertical wall at left of cols c,c+1 spanning rows r,r+1
    },
    wallsLeft: { p1: MAX_WALLS, p2: MAX_WALLS },
    currentPlayer: 'p1',
    winner: null,
    vsAI, aiPlayer, difficulty,
  };
}

// ─── Wall helpers ─────────────────────────────────────────────────────────────
export function wallKey(r, c, orient) { return `${r},${c},${orient}`; }

function hasWall(walls, r, c, orient) { return !!walls[wallKey(r, c, orient)]; }

// Returns true if movement from (r1,c1) to adjacent (r2,c2) is blocked by a wall
export function isBlocked(walls, r1, c1, r2, c2) {
  const dr = r2 - r1, dc = c2 - c1;
  if (dr === 1 && dc === 0) { // moving down (row increases)
    return hasWall(walls, r1, c1, 'h') || hasWall(walls, r1, c1 - 1, 'h');
  }
  if (dr === -1 && dc === 0) { // moving up
    return hasWall(walls, r2, c1, 'h') || hasWall(walls, r2, c1 - 1, 'h');
  }
  if (dr === 0 && dc === 1) { // moving right
    return hasWall(walls, r1, c1, 'v') || hasWall(walls, r1 - 1, c1, 'v');
  }
  if (dr === 0 && dc === -1) { // moving left
    return hasWall(walls, r1, c2, 'v') || hasWall(walls, r1 - 1, c2, 'v');
  }
  return false;
}

// ─── Pawn moves ───────────────────────────────────────────────────────────────
export function getPawnMoves(state, player) {
  const { pawns, walls } = state;
  const opp = player === 'p1' ? 'p2' : 'p1';
  const { row, col } = pawns[player];
  const { row: or, col: oc } = pawns[opp];
  const moves = [];

  const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of dirs) {
    const nr = row + dr, nc = col + dc;
    if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
    if (isBlocked(walls, row, col, nr, nc)) continue;
    if (nr === or && nc === oc) {
      // Jump: try to jump over opponent
      const jr = nr + dr, jc = nc + dc;
      if (jr >= 0 && jr < SIZE && jc >= 0 && jc < SIZE && !isBlocked(walls, nr, nc, jr, jc)) {
        moves.push({ type: 'move', row: jr, col: jc });
      } else {
        // Diagonal jumps when straight is blocked
        for (const [sdr, sdc] of dirs) {
          if (sdr === -dr && sdc === -dc) continue;
          const sr = nr + sdr, sc = nc + sdc;
          if (sr < 0 || sr >= SIZE || sc < 0 || sc >= SIZE) continue;
          if (!isBlocked(walls, nr, nc, sr, sc)) {
            moves.push({ type: 'move', row: sr, col: sc });
          }
        }
      }
    } else {
      moves.push({ type: 'move', row: nr, col: nc });
    }
  }
  return moves;
}

// ─── Wall placement ───────────────────────────────────────────────────────────
// Horizontal wall at (r,c,'h'): blocks passage between row r and r+1, at cols c and c+1
// Vertical wall at (r,c,'v'): blocks passage between col c and c+1, at rows r and r+1
export function canPlaceWall(state, r, c, orient) {
  const { walls, wallsLeft, currentPlayer } = state;
  if (wallsLeft[currentPlayer] <= 0) return false;
  if (orient === 'h') {
    if (r < 0 || r >= SIZE - 1 || c < 0 || c >= SIZE - 1) return false;
    if (hasWall(walls, r, c, 'h')) return false;
    if (hasWall(walls, r, c + 1, 'h') || hasWall(walls, r, c - 1, 'h')) return false; // overlap
    if (hasWall(walls, r, c, 'v')) return false; // cross
  } else {
    if (r < 0 || r >= SIZE - 1 || c < 0 || c >= SIZE - 1) return false;
    if (hasWall(walls, r, c, 'v')) return false;
    if (hasWall(walls, r + 1, c, 'v') || hasWall(walls, r - 1, c, 'v')) return false;
    if (hasWall(walls, r, c, 'h')) return false;
  }
  // Check both players still have a path after placing
  const testWalls = { ...walls, [wallKey(r, c, orient)]: true };
  return hasPath(testWalls, state.pawns.p1, 8) && hasPath(testWalls, state.pawns.p2, 0);
}

function hasPath(walls, { row, col }, goalRow) {
  const visited = new Set();
  const queue = [[row, col]];
  while (queue.length) {
    const [r, c] = queue.shift();
    if (r === goalRow) return true;
    const k = `${r},${c}`;
    if (visited.has(k)) continue;
    visited.add(k);
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
      if (!isBlocked(walls, r, c, nr, nc)) queue.push([nr, nc]);
    }
  }
  return false;
}

// ─── Apply move ───────────────────────────────────────────────────────────────
export function applyMove(state, move) {
  const next = state.currentPlayer === 'p1' ? 'p2' : 'p1';
  if (move.type === 'move') {
    const pawns = { ...state.pawns, [state.currentPlayer]: { row: move.row, col: move.col } };
    const goalRow = state.currentPlayer === 'p1' ? SIZE - 1 : 0;
    const winner = move.row === goalRow ? state.currentPlayer : null;
    return { ...state, pawns, currentPlayer: winner ? state.currentPlayer : next, winner };
  }
  if (move.type === 'wall') {
    const walls = { ...state.walls, [wallKey(move.r, move.c, move.orient)]: true };
    const wallsLeft = { ...state.wallsLeft, [state.currentPlayer]: state.wallsLeft[state.currentPlayer] - 1 };
    return { ...state, walls, wallsLeft, currentPlayer: next };
  }
  return state;
}

// ─── All moves (for AI) ────────────────────────────────────────────────────────
export function getAllMoves(state, player) {
  const moves = getPawnMoves(state, player);
  if (state.wallsLeft[player] > 0) {
    for (let r = 0; r < SIZE - 1; r++) {
      for (let c = 0; c < SIZE - 1; c++) {
        if (canPlaceWall(state, r, c, 'h')) moves.push({ type: 'wall', r, c, orient: 'h' });
        if (canPlaceWall(state, r, c, 'v')) moves.push({ type: 'wall', r, c, orient: 'v' });
      }
    }
  }
  return moves;
}

// ─── Heuristic ────────────────────────────────────────────────────────────────
export function shortestPathLen(walls, { row, col }, goalRow) {
  const dist = Array.from({ length: SIZE }, () => Array(SIZE).fill(Infinity));
  dist[row][col] = 0;
  const queue = [[0, row, col]];
  while (queue.length) {
    queue.sort((a,b) => a[0]-b[0]);
    const [d, r, c] = queue.shift();
    if (d > dist[r][c]) continue;
    if (r === goalRow) return d;
    for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nr = r+dr, nc = c+dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
      if (isBlocked(walls, r, c, nr, nc)) continue;
      if (d + 1 < dist[nr][nc]) { dist[nr][nc] = d + 1; queue.push([d+1,nr,nc]); }
    }
  }
  return Infinity;
}

export function evaluate(state, player) {
  if (state.winner === player) return 100000;
  if (state.winner) return -100000;
  const opp = player === 'p1' ? 'p2' : 'p1';
  const myGoal = player === 'p1' ? SIZE - 1 : 0;
  const oppGoal = opp === 'p1' ? SIZE - 1 : 0;
  const myDist = shortestPathLen(state.walls, state.pawns[player], myGoal);
  const oppDist = shortestPathLen(state.walls, state.pawns[opp], oppGoal);
  return oppDist - myDist;
}

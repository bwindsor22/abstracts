// Game.js — Complete Tak logic (no rendering deps)

export const SIZE = 5;

const FLAT_SUPPLY = { 3: 10, 4: 15, 5: 21, 6: 30, 8: 50 };
const CAP_SUPPLY  = { 3: 0,  4: 0,  5: 1,  6: 1,  8: 2  };

export function initState(size = SIZE) {
  return {
    size,
    board: Array(size * size).fill(null).map(() => []),
    // Each cell: [{owner:'p1'|'p2', type:'flat'|'stand'|'cap'}, ...] bottom→top
    supply: {
      p1: { flat: FLAT_SUPPLY[size], cap: CAP_SUPPLY[size] },
      p2: { flat: FLAT_SUPPLY[size], cap: CAP_SUPPLY[size] },
    },
    currentPlayer: 'p1',
    turn: 1,         // turns 1 & 2 are the swap turns
    winner: null,
    winReason: null, // 'road' | 'flat'
  };
}

export function cellIdx(r, c, size) { return r * size + c; }
export function cellRC(i, size)     { return { r: Math.floor(i / size), c: i % size }; }

// ── Road detection ─────────────────────────────────────────────────────────

function isRoadPiece(cell, player) {
  if (!cell.length) return false;
  const top = cell[cell.length - 1];
  return top.owner === player && (top.type === 'flat' || top.type === 'cap');
}

function bfsRoad(board, player, size, startEdge, goalEdge) {
  // startEdge / goalEdge: functions (idx) => bool
  const visited = new Set();
  const queue = [];
  for (let i = 0; i < size * size; i++) {
    if (startEdge(i, size) && isRoadPiece(board[i], player)) {
      queue.push(i);
      visited.add(i);
    }
  }
  while (queue.length) {
    const cur = queue.shift();
    if (goalEdge(cur, size)) return true;
    const { r, c } = cellRC(cur, size);
    for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
      const ni = cellIdx(nr, nc, size);
      if (!visited.has(ni) && isRoadPiece(board[ni], player)) {
        visited.add(ni);
        queue.push(ni);
      }
    }
  }
  return false;
}

function hasRoad(board, player, size) {
  const topRow    = (i, s) => Math.floor(i / s) === 0;
  const bottomRow = (i, s) => Math.floor(i / s) === s - 1;
  const leftCol   = (i, s) => i % s === 0;
  const rightCol  = (i, s) => i % s === s - 1;
  return (
    bfsRoad(board, player, size, topRow, bottomRow) ||
    bfsRoad(board, player, size, leftCol, rightCol)
  );
}

function countFlatTops(board, player) {
  return board.filter(cell => {
    if (!cell.length) return false;
    const top = cell[cell.length - 1];
    // Flat stones AND capstones count for flat-win scoring (per rules)
    return top.owner === player && (top.type === 'flat' || top.type === 'cap');
  }).length;
}

function checkWin(state, movedPlayer) {
  const { board, size, supply } = state;
  const p1Road = hasRoad(board, 'p1', size);
  const p2Road = hasRoad(board, 'p2', size);

  if (p1Road || p2Road) {
    // If both roads complete simultaneously (mover completes opponent's road),
    // per official rules the opponent wins (the mover caused the road, opponent gets the win).
    if (p1Road && p2Road) {
      const opp = movedPlayer === 'p1' ? 'p2' : 'p1';
      return { winner: opp, winReason: 'road' };
    }
    return { winner: p1Road ? 'p1' : 'p2', winReason: 'road' };
  }

  const boardFull = board.every(cell => cell.length > 0);
  const p1Out = supply.p1.flat === 0 && supply.p1.cap === 0;
  const p2Out = supply.p2.flat === 0 && supply.p2.cap === 0;

  if (boardFull || p1Out || p2Out) {
    const f1 = countFlatTops(board, 'p1');
    const f2 = countFlatTops(board, 'p2');
    if (f1 !== f2) return { winner: f1 > f2 ? 'p1' : 'p2', winReason: 'flat' };
    // Tiebreaker: the player who caused the board-full / ran out of pieces loses
    // (i.e., the mover loses, so their opponent wins)
    const opp = movedPlayer === 'p1' ? 'p2' : 'p1';
    return { winner: opp, winReason: 'flat' };
  }
  return null;
}

// ── Placement ──────────────────────────────────────────────────────────────

export function canPlace(state, r, c) {
  const { size, board } = state;
  if (r < 0 || r >= size || c < 0 || c >= size) return false;
  return board[cellIdx(r, c, size)].length === 0;
}

// type: 'flat' | 'stand' | 'cap'
export function applyPlace(state, r, c, type = 'flat') {
  if (!canPlace(state, r, c)) return state;

  const { size, board, supply, currentPlayer, turn } = state;
  const i = cellIdx(r, c, size);
  const newBoard = board.map(cell => [...cell]);
  const newSupply = { p1: { ...supply.p1 }, p2: { ...supply.p2 } };

  // Turns 1 & 2: place opponent's flat stone (ignores `type` param)
  if (turn <= 2) {
    const owner = currentPlayer === 'p1' ? 'p2' : 'p1';
    newSupply[owner].flat -= 1;
    newBoard[i] = [{ owner, type: 'flat' }];
    const nextPlayer = currentPlayer === 'p1' ? 'p2' : 'p1';
    return { ...state, board: newBoard, supply: newSupply, currentPlayer: nextPlayer, turn: turn + 1 };
  }

  // Normal placement
  const owner = currentPlayer;
  if (type === 'cap') {
    if (newSupply[owner].cap <= 0) return state;
    newSupply[owner].cap -= 1;
  } else {
    if (newSupply[owner].flat <= 0) return state;
    newSupply[owner].flat -= 1;
  }
  newBoard[i] = [{ owner, type }];

  const nextPlayer = currentPlayer === 'p1' ? 'p2' : 'p1';
  const newState = { ...state, board: newBoard, supply: newSupply, currentPlayer: nextPlayer, turn: turn + 1 };
  const win = checkWin(newState, currentPlayer);
  return win ? { ...newState, ...win } : newState;
}

// ── Movement ───────────────────────────────────────────────────────────────

const DIR_DELTA = { up: [-1,0], down: [1,0], left: [0,-1], right: [0,1] };
export const DIRS = Object.keys(DIR_DELTA);

// Can a stack at (r,c) be picked up for movement?
export function canPickUp(state, r, c) {
  const { size, board, currentPlayer, turn } = state;
  if (turn <= 2) return false;
  const cell = board[cellIdx(r, c, size)];
  if (!cell.length) return false;
  const top = cell[cell.length - 1];
  return top.owner === currentPlayer;
}

// Get valid single-step move targets from a selected square+count in one direction
// Returns array of { r, c, dir } that are valid first-step landing squares
export function getValidMoveSquares(state, fromR, fromC, count) {
  const { size, board } = state;
  const results = [];
  const fromCell = board[cellIdx(fromR, fromC, size)];
  const carried = fromCell.slice(-count);

  for (const dir of DIRS) {
    const [dr, dc] = DIR_DELTA[dir];
    let r = fromR + dr, c = fromC + dc;
    // Walk up to (size-1) steps in this direction
    for (let step = 0; step < size - 1 && r >= 0 && r < size && c >= 0 && c < size; step++) {
      const dest = board[cellIdx(r, c, size)];
      const destTop = dest.length ? dest[dest.length - 1] : null;

      if (!destTop) {
        results.push({ r, c, dir, steps: step + 1 });
        r += dr; c += dc;
        continue;
      }
      if (destTop.type === 'cap') break; // blocked
      if (destTop.type === 'stand') {
        // Only passable/enterable if arriving capstone is alone as last piece
        // For our simplified model: only allow if count === 1 and top piece is cap
        if (count === 1 && carried[0].type === 'cap') {
          results.push({ r, c, dir, steps: step + 1, flattens: true });
        }
        break;
      }
      // flat top — can enter and continue
      results.push({ r, c, dir, steps: step + 1 });
      r += dr; c += dc;
    }
  }
  return results;
}

// Apply a move: pick up `count` from (fromR,fromC), move toward destination,
// dropping 1 per intermediate square and all remainder at destination.
export function applyMoveStack(state, fromR, fromC, count, toR, toC) {
  const { size, board, currentPlayer } = state;
  const [dr, dc] = [toR - fromR, toC - fromC];
  const steps = Math.max(Math.abs(dr), Math.abs(dc));
  if (steps === 0) return state;
  const dirR = dr / steps, dirC = dc / steps;

  const newBoard = board.map(cell => [...cell]);
  const fromIdx = cellIdx(fromR, fromC, size);
  const carried = newBoard[fromIdx].splice(newBoard[fromIdx].length - count, count);

  // Drop 1 per intermediate square, all remainder at final destination
  let r = fromR, c = fromC;
  let rem = [...carried];
  for (let step = 1; step <= steps; step++) {
    r += dirR; c += dirC;
    const destIdx = cellIdx(r, c, size);
    const isLast = step === steps;
    // Drop all remaining pieces at the final destination; drop 1 at each intermediate square.
    let toDrop;
    if (isLast) {
      toDrop = rem;
      rem = [];
    } else {
      toDrop = rem.splice(0, 1);
    }

    // Capstone flattens standing stone
    if (newBoard[destIdx].length) {
      const destTop = newBoard[destIdx][newBoard[destIdx].length - 1];
      if (destTop.type === 'stand') {
        newBoard[destIdx][newBoard[destIdx].length - 1] = { ...destTop, type: 'flat' };
      }
    }
    newBoard[destIdx] = [...newBoard[destIdx], ...toDrop];
    if (isLast) break;
  }

  const nextPlayer = currentPlayer === 'p1' ? 'p2' : 'p1';
  const newState = { ...state, board: newBoard, currentPlayer: nextPlayer, turn: state.turn + 1 };
  const win = checkWin(newState, currentPlayer);
  return win ? { ...newState, ...win } : newState;
}

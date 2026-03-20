// Game.js — Abalone core logic (pure, no React)
// 61-cell hexagonal board, radius 4. Push 6 opponent marbles off to win.

export const RADIUS = 4;

export const DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]];

export function isValid(q, r) {
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(q+r)) <= RADIUS;
}

export function key(q, r) { return `${q},${r}`; }
export function parseKey(k) { const [q,r] = k.split(',').map(Number); return [q,r]; }

// ─── Starting positions ───────────────────────────────────────────────────────
// Classic Abalone standard layout (14 marbles each)
const BLACK_START = [
  [-4,4],[-3,4],[-2,4],[-1,4],[0,4],          // row r=4 (5)
  [-4,3],[-3,3],[-2,3],[-1,3],[0,3],[1,3],    // row r=3 (6)
  [-1,2],[0,2],[1,2],                           // row r=2 center (3)
];
const WHITE_START = [
  [0,-4],[1,-4],[2,-4],[3,-4],[4,-4],          // row r=-4 (5)
  [-1,-3],[0,-3],[1,-3],[2,-3],[3,-3],[4,-3],  // row r=-3 (6)
  [-1,-2],[0,-2],[1,-2],                        // row r=-2 center (3)
];

export function initState({ vsAI = false, aiPlayer = 'white', difficulty = 'medium' } = {}) {
  const board = {};
  for (const [q, r] of BLACK_START) board[key(q, r)] = 'black';
  for (const [q, r] of WHITE_START) board[key(q, r)] = 'white';
  return {
    board,
    currentPlayer: 'black',
    captured: { black: 0, white: 0 }, // opponent marbles pushed off
    winner: null,
    selected: [],   // selected marble keys (UI)
    moveCount: 0,
    vsAI, aiPlayer, difficulty,
  };
}

// ─── Move Generation ──────────────────────────────────────────────────────────
// A move: { type:'inline'|'broadside', marbles:[key,...], dir:[dq,dr] }

function addVec([q1,r1],[dq,dr],n=1) { return [q1+dq*n, r1+dr*n]; }

function inlineGroup(board, player, [q,r], [dq,dr]) {
  // Returns array of [q,r] of consecutive own marbles starting at (q,r) in direction (dq,dr)
  const group = [];
  let [cq, cr] = [q, r];
  while (isValid(cq,cr) && board[key(cq,cr)] === player && group.length < 3) {
    group.push([cq, cr]);
    cq += dq; cr += dr;
  }
  return group;
}

function getInlineMoves(board, player, [q,r], [dq,dr]) {
  const opp = player === 'black' ? 'white' : 'black';
  const group = inlineGroup(board, player, [q,r], [dq,dr]);
  if (group.length === 0) return [];

  const moves = [];
  // Try moving group forward (in [dq,dr] direction)
  const [fq, fr] = addVec(group[group.length-1], [dq,dr]);
  const frontKey = key(fq, fr);
  if (!isValid(fq, fr)) {
    // Front falls off — only valid if we're pushing: group ends at edge = not a marble push scenario
    // (marbles don't push themselves off; only opponent can be pushed off)
  } else if (!board[frontKey]) {
    // Empty: slide group forward
    moves.push({ type: 'inline', marbles: group.map(([q,r]) => key(q,r)), dir: [dq,dr] });
  } else if (board[frontKey] === opp) {
    // Potential sumito: count opponent marbles ahead
    let oppCount = 0;
    let [aq,ar] = [fq,fr];
    while (isValid(aq,ar) && board[key(aq,ar)] === opp && oppCount < group.length) {
      oppCount++;
      aq += dq; ar += dr;
    }
    // Can push if we have strictly more marbles
    if (group.length > oppCount) {
      // Check the cell behind last opponent
      if (!isValid(aq,ar) || !board[key(aq,ar)]) {
        moves.push({ type: 'inline', marbles: group.map(([q,r]) => key(q,r)), dir: [dq,dr] });
      }
    }
  }

  // Try moving group backward (in [-dq,-dr] direction)
  const [bq, br] = addVec(group[0], [-dq,-dr]);
  const backKey = key(bq, br);
  if (isValid(bq,br) && !board[backKey]) {
    moves.push({ type: 'inline', marbles: group.map(([q,r]) => key(q,r)), dir: [-dq,-dr] });
  }

  return moves;
}

function getBroadsideMoves(board, player, [q,r], [dq,dr]) {
  // Group of 2-3 marbles aligned in (dq,dr); move them sideways
  const group = inlineGroup(board, player, [q,r], [dq,dr]);
  if (group.length < 2) return [];
  const moves = [];
  for (const [sdq,sdr] of DIRS) {
    if ((sdq === dq && sdr === dr) || (sdq === -dq && sdr === -dr)) continue; // not along own axis
    // Check all marbles can move in this direction
    if (group.every(([mq,mr]) => {
      const [nq,nr] = [mq+sdq, mr+sdr];
      return isValid(nq,nr) && !board[key(nq,nr)];
    })) {
      moves.push({ type: 'broadside', marbles: group.map(([q,r]) => key(q,r)), dir: [sdq,sdr] });
    }
  }
  return moves;
}

export function getAllMoves(state, player) {
  const { board } = state;
  const seen = new Set();
  const moves = [];

  const ownKeys = Object.keys(board).filter(k => board[k] === player);

  for (const k of ownKeys) {
    const [q,r] = parseKey(k);
    for (const dir of DIRS) {
      // Inline moves starting at this marble going in this direction
      for (const m of getInlineMoves(board, player, [q,r], dir)) {
        const id = JSON.stringify(m);
        if (!seen.has(id)) { seen.add(id); moves.push(m); }
      }
      // Broadside moves for group starting here going in this direction
      for (const m of getBroadsideMoves(board, player, [q,r], dir)) {
        const id = JSON.stringify(m);
        if (!seen.has(id)) { seen.add(id); moves.push(m); }
      }
    }
  }

  return moves;
}

// ─── Apply move ───────────────────────────────────────────────────────────────
export function applyMove(state, move) {
  const { board, currentPlayer, captured } = state;
  const opp = currentPlayer === 'black' ? 'white' : 'black';
  const [dq, dr] = move.dir;
  const newBoard = { ...board };
  const newCaptured = { ...captured };

  if (move.type === 'inline') {
    // Move marbles in move.dir direction one at a time from the front
    const marbles = move.marbles.map(parseKey);
    // Determine push direction: are marbles sorted in dir or -dir?
    // Sort marbles: furthest in dir goes first
    const sorted = [...marbles].sort((a, b) => {
      const da = a[0]*dq + a[1]*dr;
      const db = b[0]*dq + b[1]*dr;
      return db - da; // descending: furthest first
    });

    // Move from front to back to avoid overwriting
    for (const [mq, mr] of sorted) {
      const [nq, nr] = [mq+dq, mr+dr];
      const nk = key(nq, nr);
      const ok = key(mq, mr);
      if (!isValid(nq, nr)) {
        // Marble falls off — this means opponent marble pushed off
        if (newBoard[ok] === opp) newCaptured[currentPlayer]++;
        delete newBoard[ok];
      } else {
        newBoard[nk] = newBoard[ok];
        delete newBoard[ok];
      }
    }

    // If pushing opponent marbles, move them too (chain)
    // The opponent marbles are immediately ahead of the sorted[0]
    // Actually the sorted array only contains player marbles; we need to push opponent chain too
    // Re-approach: process the entire column from front
  } else {
    // Broadside: each marble moves in dir
    // Move all at once by clearing then placing
    const marbles = move.marbles.map(parseKey);
    const color = newBoard[move.marbles[0]];
    for (const [mq,mr] of marbles) delete newBoard[key(mq,mr)];
    for (const [mq,mr] of marbles) newBoard[key(mq+dq,mr+dr)] = color;
  }

  const winner = newCaptured.black >= 6 ? 'black' : newCaptured.white >= 6 ? 'white' : null;
  const next = currentPlayer === 'black' ? 'white' : 'black';
  return { ...state, board: newBoard, captured: newCaptured, winner, currentPlayer: winner ? currentPlayer : next, selected: [], moveCount: (state.moveCount || 0) + 1 };
}

// Fix: inline push needs to process the entire chain (own + opponent marbles)
export function applyMoveFixed(state, move) {
  const { board, currentPlayer, captured } = state;
  const opp = currentPlayer === 'black' ? 'white' : 'black';
  const [dq, dr] = move.dir;
  const newBoard = { ...board };
  const newCaptured = { ...captured };

  if (move.type === 'inline') {
    const marbles = move.marbles.map(parseKey);

    // Find the leading marble (furthest in dir)
    const leading = marbles.reduce((best, m) => {
      return (m[0]*dq + m[1]*dr) > (best[0]*dq + best[1]*dr) ? m : best;
    });

    // Collect the full chain: own marbles + any opponent marbles being pushed
    const chain = [...marbles];
    let [cq, cr] = [leading[0]+dq, leading[1]+dr];
    while (isValid(cq,cr) && newBoard[key(cq,cr)] === opp) {
      chain.push([cq,cr]);
      cq += dq; cr += dr;
    }
    // cq,cr is now the first empty/off-board cell ahead of chain

    // Move chain from front to back (reverse order: process furthest first)
    chain.sort((a,b) => (b[0]*dq+b[1]*dr) - (a[0]*dq+a[1]*dr));
    for (const [mq,mr] of chain) {
      const [nq,nr] = [mq+dq, mr+dr];
      const ok = key(mq,mr);
      if (!isValid(nq,nr)) {
        // Falls off
        if (newBoard[ok] === opp) newCaptured[currentPlayer]++;
        delete newBoard[ok];
      } else {
        newBoard[key(nq,nr)] = newBoard[ok];
        delete newBoard[ok];
      }
    }
  } else {
    // Broadside
    const color = newBoard[move.marbles[0]];
    const marbles = move.marbles.map(parseKey);
    for (const [mq,mr] of marbles) delete newBoard[key(mq,mr)];
    for (const [mq,mr] of marbles) newBoard[key(mq+dq,mr+dr)] = color;
  }

  const winner = newCaptured.black >= 6 ? 'black' : newCaptured.white >= 6 ? 'white' : null;
  const next = currentPlayer === 'black' ? 'white' : 'black';
  return { ...state, board: newBoard, captured: newCaptured, winner, currentPlayer: winner ? currentPlayer : next, selected: [], moveCount: (state.moveCount || 0) + 1 };
}

// ─── Heuristic ────────────────────────────────────────────────────────────────
export function evaluate(state, player) {
  if (state.winner === player) return 100000;
  if (state.winner) return -100000;
  const opp = player === 'black' ? 'white' : 'black';

  let score = 0;
  // Captured marble difference (each captured = big advantage)
  score += (state.captured[player] - state.captured[opp]) * 200;

  // Center control: own marbles closer to center score better
  for (const [k, p] of Object.entries(state.board)) {
    const [q, r] = parseKey(k);
    const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(q+r));
    if (p === player) score += (RADIUS - dist) * 3;
    else score -= (RADIUS - dist) * 2;
  }

  // Cohesion bonus: marbles adjacent to own marbles
  const ownKeys = Object.keys(state.board).filter(k => state.board[k] === player);
  for (const k of ownKeys) {
    const [q,r] = parseKey(k);
    for (const [dq,dr] of DIRS) {
      if (state.board[key(q+dq,r+dr)] === player) score += 2;
    }
  }

  return score;
}

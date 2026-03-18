// ai.js — Tak AI
import {
  cellIdx, cellRC,
  canPlace, applyPlace,
  canPickUp, getValidMoveSquares, applyMoveStack,
} from '../Game';

// ── Move generation ────────────────────────────────────────────────────────────

function getAllMoves(state) {
  const { board, size, supply, currentPlayer, turn } = state;
  const moves = [];

  if (turn <= 2) {
    // Swap turns: place opponent's flat anywhere empty
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (canPlace(state, r, c)) moves.push({ kind: 'place', r, c, type: 'flat' });
    return moves;
  }

  // Placements
  const sup = supply[currentPlayer];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!canPlace(state, r, c)) continue;
      if (sup.flat > 0) {
        moves.push({ kind: 'place', r, c, type: 'flat' });
        moves.push({ kind: 'place', r, c, type: 'stand' });
      }
      if (sup.cap > 0) {
        moves.push({ kind: 'place', r, c, type: 'cap' });
      }
    }
  }

  // Stack moves
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!canPickUp(state, r, c)) continue;
      const maxCount = Math.min(size, board[cellIdx(r, c, size)].length);
      for (let count = 1; count <= maxCount; count++) {
        const targets = getValidMoveSquares(state, r, c, count);
        for (const t of targets) {
          moves.push({ kind: 'move', fromR: r, fromC: c, count, toR: t.r, toC: t.c });
        }
      }
    }
  }

  return moves;
}

function applyMove(state, move) {
  if (move.kind === 'place') return applyPlace(state, move.r, move.c, move.type);
  return applyMoveStack(state, move.fromR, move.fromC, move.count, move.toR, move.toC);
}

// ── Evaluation ─────────────────────────────────────────────────────────────────

// Rough road-connectivity score: count flat/cap tops per player and their spread
function roadScore(board, player, size) {
  const cells = [];
  for (let i = 0; i < size * size; i++) {
    const cell = board[i];
    if (!cell.length) continue;
    const top = cell[cell.length - 1];
    if (top.owner === player && (top.type === 'flat' || top.type === 'cap')) {
      cells.push(cellRC(i, size));
    }
  }
  if (cells.length === 0) return 0;

  // BFS component sizes — reward large connected components
  const visited = new Set();
  let maxComp = 0;
  for (const { r, c } of cells) {
    const key = `${r},${c}`;
    if (visited.has(key)) continue;
    const queue = [{ r, c }];
    visited.add(key);
    let comp = 0;
    while (queue.length) {
      const { r: cr, c: cc } = queue.shift();
      comp++;
      for (const [dr, dc] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nr = cr + dr, nc = cc + dc;
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;
        const nk = `${nr},${nc}`;
        if (visited.has(nk)) continue;
        const nc2 = board[cellIdx(nr, nc, size)];
        if (!nc2.length) continue;
        const ntop = nc2[nc2.length - 1];
        if (ntop.owner === player && (ntop.type === 'flat' || ntop.type === 'cap')) {
          visited.add(nk);
          queue.push({ r: nr, c: nc });
        }
      }
    }
    maxComp = Math.max(maxComp, comp);
  }
  return cells.length * 2 + maxComp * 3;
}

function evaluate(state, player) {
  if (state.winner === player) return 100000;
  if (state.winner && state.winner !== player) return -100000;

  const opp = player === 'p1' ? 'p2' : 'p1';
  const myRoad  = roadScore(state.board, player, state.size);
  const oppRoad = roadScore(state.board, opp, state.size);

  // Supply: more pieces in hand = flexibility
  const mySup  = state.supply[player].flat  + state.supply[player].cap  * 2;
  const oppSup = state.supply[opp].flat + state.supply[opp].cap * 2;

  return (myRoad - oppRoad) * 3 + (mySup - oppSup) * 0.5;
}

// ── Minimax ────────────────────────────────────────────────────────────────────

function minimax(state, depth, alpha, beta, maximizing, player) {
  if (state.winner || depth === 0) return evaluate(state, player);

  const moves = getAllMoves(state);
  if (moves.length === 0) return evaluate(state, player);

  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const next = applyMove(state, m);
      const val = minimax(next, depth - 1, alpha, beta, false, player);
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const next = applyMove(state, m);
      const val = minimax(next, depth - 1, alpha, beta, true, player);
      if (val < best) best = val;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }
}

const DEPTH = { easy: 1, medium: 2, hard: 3 };

export function getAIMove(state, player, difficulty = 'medium') {
  const moves = getAllMoves(state);
  if (moves.length === 0) return null;

  // Instant win check
  for (const m of moves) {
    const next = applyMove(state, m);
    if (next.winner === player) return m;
  }

  if (difficulty === 'easy') {
    // Prefer flat placements to random moves
    const flats = moves.filter(m => m.kind === 'place' && m.type === 'flat');
    const pool = flats.length > 0 ? flats : moves;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const depth = DEPTH[difficulty] ?? 2;

  // Limit branching for performance: sample moves
  let candidates = moves;
  if (moves.length > 30) {
    // Prioritize: flat placements and short stack moves
    const prioritized = moves.filter(m =>
      (m.kind === 'place' && m.type === 'flat') ||
      (m.kind === 'move' && m.count === 1)
    );
    candidates = prioritized.length >= 15 ? prioritized : moves.slice(0, 40);
  }

  let bestVal = -Infinity;
  let bestMove = candidates[0];
  for (const m of candidates) {
    const next = applyMove(state, m);
    const val = minimax(next, depth - 1, -Infinity, Infinity, false, player);
    if (val > bestVal) { bestVal = val; bestMove = m; }
  }
  return bestMove;
}

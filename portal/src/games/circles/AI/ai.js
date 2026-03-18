// ai.js — YINSH AI player (easy / medium / hard)
import {
  getAllLegalMoves, applyMove, placeRingSetup,
  removeRow, scoreRing, parseKey, coordKey, isValidCell, DIRECTIONS,
} from '../Game.js';

// ─── Heuristic ────────────────────────────────────────────────────────────────
// Center of the board has coordinates near (0,0); edge cells have higher |q|+|r|.
// Rings near center are more mobile and valuable.
function ringMobility(state, ringKey) {
  const [q, r] = parseKey(ringKey);
  let count = 0;
  for (const [dq, dr] of DIRECTIONS) {
    let cq = q + dq, cr = r + dr;
    while (isValidCell(cq, cr)) {
      const k = coordKey(cq, cr);
      const cell = state.board[k];
      if (cell?.type === 'ring') break;
      if (!cell) { count++; break; } // first empty after any number of markers
      cq += dq; cr += dr;
    }
  }
  return count;
}

function countRunsOf(board, color, length) {
  // Count runs of exactly `length` or more same-color markers in any direction
  const SCAN = [[1,0],[0,1],[1,-1]];
  let total = 0;
  const seen = new Set();
  for (const [dq, dr] of SCAN) {
    for (const key of Object.keys(board)) {
      const cell = board[key];
      if (!cell || cell.type !== 'marker' || cell.colorUp !== color) continue;
      const [sq, sr] = parseKey(key);
      // walk back to run start
      let [q, r] = [sq, sr];
      while (true) {
        const pk = coordKey(q - dq, r - dr);
        if (board[pk]?.type === 'marker' && board[pk]?.colorUp === color) {
          q -= dq; r -= dr;
        } else break;
      }
      const startKey = `${q},${r}|${dq},${dr}`;
      if (seen.has(startKey)) continue;
      seen.add(startKey);
      // count run
      let run = 0;
      let [cq, cr] = [q, r];
      while (isValidCell(cq, cr) && board[coordKey(cq,cr)]?.type === 'marker' && board[coordKey(cq,cr)]?.colorUp === color) {
        run++;
        cq += dq; cr += dr;
      }
      if (run >= length) total += run - length + 1;
    }
  }
  return total;
}

function evaluate(state, player) {
  if (state.phase === 'end') {
    if (state.winner === player) return 100000;
    if (state.winner && state.winner !== player) return -100000;
    return 0;
  }
  const opponent = player === 'white' ? 'black' : 'white';
  let score = 0;

  // Rings scored — most important
  score += (state.ringsScored[player] - state.ringsScored[opponent]) * 2000;

  // Marker runs — potential rows
  score += countRunsOf(state.board, player, 4) * 120;
  score += countRunsOf(state.board, player, 3) * 30;
  score += countRunsOf(state.board, player, 2) * 6;
  score -= countRunsOf(state.board, opponent, 4) * 140;
  score -= countRunsOf(state.board, opponent, 3) * 35;

  // Ring mobility — rings that can move to more places are better
  for (const k of state.ringsOnBoard[player]) score += ringMobility(state, k) * 4;
  for (const k of state.ringsOnBoard[opponent]) score -= ringMobility(state, k) * 3;

  return score;
}

// ─── Auto-resolve rows ────────────────────────────────────────────────────────
// During minimax we auto-resolve rows greedily: remove first pending row,
// then remove the ring with lowest mobility (keep the good rings).
function autoResolve(state) {
  let s = state;
  while (s.phase === 'resolveRows') {
    const player = s.resolvingPlayer;
    // Find a row for resolvingPlayer
    const rowIdx = s.pendingRows.findIndex(r => r.player === player);
    if (rowIdx < 0) break; // shouldn't happen
    s = removeRow(s, rowIdx);
    // Now pick which ring to score (remove from board): pick least-mobile ring
    const rings = s.ringsOnBoard[player];
    if (!rings || rings.length === 0) break;
    let worstRing = rings[0];
    let worstMob = ringMobility(s, worstRing);
    for (const k of rings) {
      const mob = ringMobility(s, k);
      if (mob < worstMob) { worstMob = mob; worstRing = k; }
    }
    s = scoreRing(s, worstRing);
  }
  return s;
}

// ─── Minimax ──────────────────────────────────────────────────────────────────
function minimax(state, depth, alpha, beta, maximizing, rootPlayer) {
  // Resolve any pending rows before evaluating
  if (state.phase === 'resolveRows') state = autoResolve(state);
  if (state.phase === 'end' || depth === 0) return evaluate(state, rootPlayer);

  const currentPlayer = state.phase === 'setup' ? state.currentPlayer : state.currentPlayer;
  const moves = getAllLegalMoves(state, currentPlayer);
  if (moves.length === 0) return evaluate(state, rootPlayer);

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      const next = applyMoveGeneric(state, move);
      const val = minimax(next, depth - 1, alpha, beta, false, rootPlayer);
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      const next = applyMoveGeneric(state, move);
      const val = minimax(next, depth - 1, alpha, beta, true, rootPlayer);
      if (val < best) best = val;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }
}

function applyMoveGeneric(state, move) {
  if (move.type === 'placeRing') return placeRingSetup(state, move.to);
  return applyMove(state, move.from, move.to);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function getAIMove(state, player, difficulty = 'medium') {
  // Handle resolveRows: auto-pick (called from App.js when it's AI's resolve turn)
  if (state.phase === 'resolveRows' && state.resolvingPlayer === player) {
    if (state.resolveStep === 'selectRing') {
      const rings = state.ringsOnBoard[player];
      if (!rings || rings.length === 0) return null;
      let worstRing = rings[0];
      let worstMob = ringMobility(state, worstRing);
      for (const k of rings) {
        const mob = ringMobility(state, k);
        if (mob < worstMob) { worstMob = mob; worstRing = k; }
      }
      return { type: 'scoreRing', ringKey: worstRing };
    }
    const rowIdx = state.pendingRows.findIndex(r => r.player === player);
    if (rowIdx >= 0) return { type: 'removeRow', rowIndex: rowIdx };
    return null;
  }

  const moves = getAllLegalMoves(state, player);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    return shuffle([...moves])[0];
  }

  const depth = difficulty === 'hard' ? 3 : 2;
  const isMax = state.currentPlayer === player;

  let bestMove = null;
  let bestVal = -Infinity;
  const shuffled = shuffle([...moves]);

  for (const move of shuffled) {
    const next = applyMoveGeneric(state, move);
    const val = minimax(next, depth - 1, -Infinity, Infinity, !isMax, player);
    if (val > bestVal) {
      bestVal = val;
      bestMove = move;
    }
  }
  return bestMove;
}

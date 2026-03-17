// ai.js — TwixT AI (minimax with alpha-beta)
import { getEmptyCells, applyMove, evaluate, SIZE } from '../Game.js';

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function scorePeg(state, player, r, c) {
  // Score by quick evaluate after placing
  const next = applyMove(state, r, c);
  return evaluate(next, player);
}

function getCandidates(state, player) {
  const cells = getEmptyCells(state.board, player);
  // Limit initial pool, then sort by heuristic
  const pool = cells.length > 60
    ? cells.filter(([r, c]) => {
        // Only consider cells near existing pegs (within knight-move distance)
        for (const [dr, dc] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]) {
          const nr = r + dr, nc = c + dc;
          if (state.board[`${nr},${nc}`]) return true;
        }
        // Also include edge cells for initial moves
        if (player === 'red' && (r <= 2 || r >= SIZE - 3)) return true;
        if (player === 'blue' && (c <= 2 || c >= SIZE - 3)) return true;
        return false;
      })
    : cells;
  return pool
    .map(([r, c]) => ({ r, c, s: scorePeg(state, player, r, c) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 20)
    .map(x => [x.r, x.c]);
}

function minimax(state, depth, alpha, beta, maximizing, aiPlayer) {
  const score = evaluate(state, aiPlayer);
  if (Math.abs(score) >= 100000 || depth === 0 || state.winner) return score;
  const cur = maximizing ? aiPlayer : (aiPlayer === 'red' ? 'blue' : 'red');
  const cands = getCandidates(state, cur);
  if (cands.length === 0) return score;

  if (maximizing) {
    let best = -Infinity;
    for (const [r, c] of cands) {
      const val = minimax(applyMove(state, r, c), depth - 1, alpha, beta, false, aiPlayer);
      if (val > best) best = val;
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [r, c] of cands) {
      const val = minimax(applyMove(state, r, c), depth - 1, alpha, beta, true, aiPlayer);
      if (val < best) best = val;
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
}

export function getAIMove(state, player, difficulty = 'medium') {
  const cells = getEmptyCells(state.board, player);
  if (cells.length === 0) return null;
  if (difficulty === 'easy') return shuffle(cells)[0];

  const depth = difficulty === 'hard' ? 3 : 2;
  const cands = getCandidates(state, player);

  let bestCell = cands[0], bestVal = -Infinity;
  for (const [r, c] of cands) {
    const val = minimax(applyMove(state, r, c), depth - 1, -Infinity, Infinity, false, player);
    if (val > bestVal) { bestVal = val; bestCell = [r, c]; }
  }
  return bestCell;
}

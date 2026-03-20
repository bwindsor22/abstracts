// ai.js — TwixT AI (minimax with alpha-beta + time limit)
import { getEmptyCells, applyMove, evaluate, SIZE } from '../Game.js';

// Time-limited search: hard mode uses iterative deepening within a budget
const TIME_LIMIT_MS = 3000; // 3-second max for AI search
let searchDeadline = 0;
let searchAborted = false;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function scorePeg(state, player, r, c) {
  const next = applyMove(state, r, c);
  return evaluate(next, player);
}

function getCandidates(state, player, maxCands = 20) {
  const cells = getEmptyCells(state.board, player);
  const pool = cells.length > 60
    ? cells.filter(([r, c]) => {
        for (const [dr, dc] of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]]) {
          const nr = r + dr, nc = c + dc;
          if (state.board[`${nr},${nc}`]) return true;
        }
        if (player === 'red' && (r <= 2 || r >= SIZE - 3)) return true;
        if (player === 'blue' && (c <= 2 || c >= SIZE - 3)) return true;
        return false;
      })
    : cells;
  return pool
    .map(([r, c]) => ({ r, c, s: scorePeg(state, player, r, c) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, maxCands)
    .map(x => [x.r, x.c]);
}

function minimax(state, depth, alpha, beta, maximizing, aiPlayer) {
  // Check time limit
  if (Date.now() >= searchDeadline) {
    searchAborted = true;
    return evaluate(state, aiPlayer);
  }

  const score = evaluate(state, aiPlayer);
  if (Math.abs(score) >= 100000 || depth === 0 || state.winner) return score;
  const cur = maximizing ? aiPlayer : (aiPlayer === 'red' ? 'blue' : 'red');
  // Fewer candidates at deeper searches to keep branching manageable
  const cands = getCandidates(state, cur, depth <= 1 ? 12 : 16);
  if (cands.length === 0) return score;

  if (maximizing) {
    let best = -Infinity;
    for (const [r, c] of cands) {
      if (searchAborted) return best === -Infinity ? score : best;
      const val = minimax(applyMove(state, r, c), depth - 1, alpha, beta, false, aiPlayer);
      if (val > best) best = val;
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [r, c] of cands) {
      if (searchAborted) return best === Infinity ? score : best;
      const val = minimax(applyMove(state, r, c), depth - 1, alpha, beta, true, aiPlayer);
      if (val < best) best = val;
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
}

// Search at a given depth with time limit. Returns { bestCell, bestVal, completed }.
function searchAtDepth(state, player, cands, depth) {
  let bestCell = cands[0], bestVal = -Infinity;
  for (const [r, c] of cands) {
    if (searchAborted) break;
    const val = minimax(applyMove(state, r, c), depth - 1, -Infinity, Infinity, false, player);
    if (val > bestVal) { bestVal = val; bestCell = [r, c]; }
    // Early exit on guaranteed win
    if (bestVal >= 100000) break;
  }
  return { bestCell, bestVal, completed: !searchAborted };
}

export function getAIMove(state, player, difficulty = 'medium') {
  const cells = getEmptyCells(state.board, player);
  if (cells.length === 0) return null;
  if (difficulty === 'easy') return shuffle(cells)[0];

  // Set up time limit
  searchDeadline = Date.now() + TIME_LIMIT_MS;
  searchAborted = false;

  const cands = getCandidates(state, player);
  if (cands.length === 0) return null;
  if (cands.length === 1) return cands[0];

  const maxDepth = difficulty === 'hard' ? 4 : 2;

  // For medium, just do depth 2 (fast enough)
  if (difficulty === 'medium') {
    const result = searchAtDepth(state, player, cands, 2);
    return result.bestCell;
  }

  // Hard mode: iterative deepening within time budget
  let bestResult = null;
  for (let d = 1; d <= maxDepth; d++) {
    searchAborted = false;
    const result = searchAtDepth(state, player, cands, d);
    if (result.completed || !bestResult) {
      bestResult = result;
    }
    // Stop deepening if time is up or we found a winning move
    if (searchAborted || Date.now() >= searchDeadline) break;
    if (bestResult.bestVal >= 100000) break;
  }

  return bestResult.bestCell;
}

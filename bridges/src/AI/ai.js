// ai.js — TwixT AI (minimax with alpha-beta)
import { getEmptyCells, applyMove, evaluate, SIZE } from '../Game.js';

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function scorePeg(player, r, c) {
  // Prefer cells that advance toward goal
  const center = SIZE / 2;
  const centrality = center - Math.max(Math.abs(r - center), Math.abs(c - center));
  const advance = player === 'red' ? -(Math.abs(r - center)) : -(Math.abs(c - center));
  return centrality * 2 + advance * 3;
}

function getCandidates(state, player) {
  const cells = getEmptyCells(state.board, player);
  return cells.sort((a, b) => scorePeg(player, b[0], b[1]) - scorePeg(player, a[0], a[1])).slice(0, 25);
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

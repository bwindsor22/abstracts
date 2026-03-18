// ai.js — Quoridor AI
import { getAllMoves, applyMove, evaluate } from '../Game.js';

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function scoreMove(state, move, player) {
  if (move.type === 'move') {
    const cur = state.pawns[player].row;
    const delta = player === 'p1' ? move.row - cur : cur - move.row;
    return 10 + delta * 5;
  }
  return 0;
}

function minimax(state, depth, alpha, beta, maximizing, aiPlayer) {
  const score = evaluate(state, aiPlayer);
  if (Math.abs(score) >= 100000 || depth === 0) return score;
  const cur = maximizing ? aiPlayer : (aiPlayer === 'p1' ? 'p2' : 'p1');
  const moves = getAllMoves(state, cur);
  if (moves.length === 0) return score;

  const sorted = [...moves].sort((a, b) => scoreMove(state, b, cur) - scoreMove(state, a, cur));
  const candidates = sorted.slice(0, 20);

  if (maximizing) {
    let best = -Infinity;
    for (const m of candidates) {
      const val = minimax(applyMove(state, m), depth - 1, alpha, beta, false, aiPlayer);
      if (val > best) best = val;
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of candidates) {
      const val = minimax(applyMove(state, m), depth - 1, alpha, beta, true, aiPlayer);
      if (val < best) best = val;
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
}

export function getAIMove(state, player, difficulty = 'medium') {
  const moves = getAllMoves(state, player);
  if (moves.length === 0) return null;
  if (difficulty === 'easy') return shuffle(moves)[0];

  const depth = difficulty === 'hard' ? 3 : 2;
  const sorted = [...moves].sort((a, b) => scoreMove(state, b, player) - scoreMove(state, a, player));
  const candidates = sorted.slice(0, 25);

  let bestMove = candidates[0], bestVal = -Infinity;
  for (const m of candidates) {
    const val = minimax(applyMove(state, m), depth - 1, -Infinity, Infinity, false, player);
    if (val > bestVal) { bestVal = val; bestMove = m; }
  }
  return bestMove;
}

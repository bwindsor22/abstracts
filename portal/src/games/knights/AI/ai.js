// ai.js — Chess AI (minimax with alpha-beta, piece-square tables)
import { getLegalMoves, applyMove, evaluate, moveKey } from '../Game.js';

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function orderMoves(state, moves, aiPlayer) {
  return moves
    .map(m => {
      const next = applyMove(state, m);
      return { move: m, score: evaluate(next, aiPlayer) };
    })
    .sort((a, b) => b.score - a.score)
    .map(x => x.move);
}

function minimax(state, depth, alpha, beta, maximizing, aiPlayer) {
  if (state.winner || depth === 0) return evaluate(state, aiPlayer);

  const moves = getLegalMoves(state);
  if (moves.length === 0) return evaluate(state, aiPlayer);

  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const val = minimax(applyMove(state, m), depth - 1, alpha, beta, false, aiPlayer);
      if (val > best) best = val;
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const val = minimax(applyMove(state, m), depth - 1, alpha, beta, true, aiPlayer);
      if (val < best) best = val;
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
}

export function getAIMove(state, player, difficulty = 'medium') {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;
  if (difficulty === 'easy') return shuffle(moves)[0];

  const depth = difficulty === 'hard' ? 4 : 3;

  // Order moves for better pruning
  const ordered = orderMoves(state, moves, player);

  let bestMove = ordered[0], bestVal = -Infinity;
  for (const m of ordered) {
    const val = minimax(applyMove(state, m), depth - 1, -Infinity, Infinity, false, player);
    if (val > bestVal) { bestVal = val; bestMove = m; }
  }
  return bestMove;
}

// ai.js — Santorini AI (minimax with alpha-beta pruning)
import { getAllMoves, applyFullMove, evaluate, getWorkerKeys, getValidMoves } from '../Game';

function minimax(state, depth, alpha, beta, maximizing, player) {
  if (state.winner || depth === 0) return evaluate(state, player);

  const moves = getAllMoves(state);
  if (moves.length === 0) {
    // No moves = current player loses
    return state.currentPlayer === player ? -100000 : 100000;
  }

  if (maximizing) {
    let best = -Infinity;
    for (const m of moves) {
      const next = applyFullMove(state, m);
      const val = minimax(next, depth - 1, alpha, beta, false, player);
      best = Math.max(best, val);
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const m of moves) {
      const next = applyFullMove(state, m);
      const val = minimax(next, depth - 1, alpha, beta, true, player);
      best = Math.min(best, val);
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
}

const DEPTH = { easy: 1, medium: 2, hard: 3 };

export function getAIMove(state, player, difficulty = 'medium') {
  const depth = DEPTH[difficulty] ?? 2;
  const moves = getAllMoves(state);
  if (moves.length === 0) return null;

  // Instant win
  const win = moves.find(m => m.immediate);
  if (win) return win;

  if (difficulty === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  let bestVal = -Infinity;
  let bestMove = moves[0];
  for (const m of moves) {
    const next = applyFullMove(state, m);
    const val = minimax(next, depth - 1, -Infinity, Infinity, false, player);
    if (val > bestVal) { bestVal = val; bestMove = m; }
  }
  return bestMove;
}

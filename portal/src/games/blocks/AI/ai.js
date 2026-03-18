// AI for Blokus (blocks)
import { getAllMoves, applyMove, evaluate, PIECE_SIZES, AI_COLORS } from '../Game';

function getAIMoveEasy(state) {
  const color = state.currentColor;
  const moves = getAllMoves(state, color);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

function getAIMoveMedium(state) {
  const color = state.currentColor;
  const moves = getAllMoves(state, color);
  if (moves.length === 0) return null;

  // Greedy: prefer larger pieces, favor expanding toward center
  let best = null;
  let bestScore = -Infinity;

  for (const move of moves) {
    const pieceSize = PIECE_SIZES[move.pieceId];
    // Prefer larger pieces early
    let score = pieceSize * 10;
    // Prefer positions closer to center
    const centerDist = Math.abs(move.row - 9.5) + Math.abs(move.col - 9.5);
    score -= centerDist;
    // Small random factor to avoid predictability
    score += Math.random() * 2;
    if (score > bestScore) {
      bestScore = score;
      best = move;
    }
  }
  return best;
}

function getAIMoveHard(state) {
  const color = state.currentColor;
  const moves = getAllMoves(state, color);
  if (moves.length === 0) return null;

  // Score and rank top candidates, then pick best
  const scored = moves.map(move => {
    const pieceSize = PIECE_SIZES[move.pieceId];
    const centerDist = Math.abs(move.row - 9.5) + Math.abs(move.col - 9.5);
    return {
      move,
      heuristic: pieceSize * 10 - centerDist * 0.5,
    };
  });
  scored.sort((a, b) => b.heuristic - a.heuristic);
  const top = scored.slice(0, 15);

  // Evaluate each by looking one step ahead
  let best = top[0].move;
  let bestEval = -Infinity;

  for (const { move } of top) {
    const next = applyMove(state, color, move);
    const ev = evaluate(next, true);
    if (ev > bestEval) {
      bestEval = ev;
      best = move;
    }
  }

  return best;
}

export function getAIMove(state, difficulty) {
  if (!AI_COLORS.includes(state.currentColor)) return null;
  switch (difficulty) {
    case 'easy': return getAIMoveEasy(state);
    case 'hard': return getAIMoveMedium(state); // medium strategy for "hard" start
    default: return getAIMoveMedium(state);
  }
}

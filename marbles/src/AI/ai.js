// ai.js — Abalone AI: easy (random), medium (depth-2), hard (depth-3)
import { getAllMoves, applyMoveFixed, evaluate } from '../Game.js';

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Prioritise moves that push opponent marbles (sumito) or capture
function scoreMoveHeuristic(state, move, player) {
  const opp = player === 'black' ? 'white' : 'black';
  if (move.type !== 'inline') return 0;
  const [dq, dr] = move.dir;
  // Check if this is a sumito (opponent ahead of leading marble)
  const marbles = move.marbles.map(k => {
    const [q,r] = k.split(',').map(Number);
    return [q,r];
  });
  const leading = marbles.reduce((best, m) =>
    (m[0]*dq + m[1]*dr) > (best[0]*dq + best[1]*dr) ? m : best
  );
  const [nq, nr] = [leading[0]+dq, leading[1]+dr];
  const nk = `${nq},${nr}`;
  if (state.board[nk] === opp) return 50; // sumito — prioritise
  return 0;
}

function minimax(state, depth, alpha, beta, maximizing, aiPlayer) {
  const score = evaluate(state, aiPlayer);
  if (Math.abs(score) >= 100000 || depth === 0) return score;

  const currentPlayer = maximizing ? aiPlayer : (aiPlayer === 'black' ? 'white' : 'black');
  const moves = getAllMoves(state, currentPlayer);
  if (moves.length === 0) return score;

  if (maximizing) {
    let best = -Infinity;
    for (const move of moves) {
      const next = applyMoveFixed(state, move);
      const val = minimax(next, depth - 1, alpha, beta, false, aiPlayer);
      if (val > best) best = val;
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const move of moves) {
      const next = applyMoveFixed(state, move);
      const val = minimax(next, depth - 1, alpha, beta, true, aiPlayer);
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

  // Sort moves: sumito first, then broadside, then single
  const sorted = [...moves].sort((a, b) => scoreMoveHeuristic(state, b, player) - scoreMoveHeuristic(state, a, player));
  // Limit candidates for speed
  const candidates = sorted.slice(0, 30);

  let bestMove = candidates[0];
  let bestVal = -Infinity;
  for (const move of candidates) {
    const next = applyMoveFixed(state, move);
    const val = minimax(next, depth - 1, -Infinity, Infinity, false, player);
    if (val > bestVal) { bestVal = val; bestMove = move; }
  }
  return bestMove;
}

// ai.js — Hex AI: easy (random), medium (depth-2 minimax), hard (depth-3)
import { evaluate, getAllMoves, SIZE } from '../Game.js';

function minimax(board, depth, alpha, beta, maximizing, aiPlayer) {
  const opp = aiPlayer === 'red' ? 'blue' : 'red';
  const score = evaluate(board, aiPlayer);
  if (Math.abs(score) >= 100000 || depth === 0) return score;

  const moves = getAllMoves(board);
  if (moves.length === 0) return score;

  const currentPlayer = maximizing ? aiPlayer : opp;

  if (maximizing) {
    let best = -Infinity;
    for (const [r, c] of moves) {
      const newBoard = board.map(row => [...row]);
      newBoard[r][c] = currentPlayer;
      const val = minimax(newBoard, depth - 1, alpha, beta, false, aiPlayer);
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [r, c] of moves) {
      const newBoard = board.map(row => [...row]);
      newBoard[r][c] = currentPlayer;
      const val = minimax(newBoard, depth - 1, alpha, beta, true, aiPlayer);
      if (val < best) best = val;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Sort moves by proximity to center (better for Hex play)
function sortMoves(moves) {
  const center = (SIZE - 1) / 2;
  return [...moves].sort((a, b) => {
    const da = Math.abs(a[0] - center) + Math.abs(a[1] - center);
    const db = Math.abs(b[0] - center) + Math.abs(b[1] - center);
    return da - db;
  });
}

export function getAIMove(state, player, difficulty = 'medium') {
  const moves = getAllMoves(state.board);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    return shuffle(moves)[0];
  }

  const depth = difficulty === 'hard' ? 3 : 2;
  // Use sorted + limited move set for speed (top 30 center-biased moves)
  const candidates = sortMoves(moves).slice(0, difficulty === 'hard' ? 20 : 30);

  let bestMove = candidates[0];
  let bestVal = -Infinity;

  for (const [r, c] of candidates) {
    const newBoard = state.board.map(row => [...row]);
    newBoard[r][c] = player;
    const val = minimax(newBoard, depth - 1, -Infinity, Infinity, false, player);
    if (val > bestVal) {
      bestVal = val;
      bestMove = [r, c];
    }
  }
  return bestMove;
}

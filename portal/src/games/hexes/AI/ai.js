// ai.js — Hex AI: easy (random), medium (depth-2 minimax), hard (depth-4 with advanced eval)
import { evaluate, evaluateAdvanced, getAllMoves, SIZE, NEIGHBOURS, inBounds } from '../Game.js';

function minimax(board, depth, alpha, beta, maximizing, aiPlayer, evalFn) {
  const score = evalFn(board, aiPlayer);
  if (Math.abs(score) >= 100000 || depth === 0) return score;

  const opp = aiPlayer === 'red' ? 'blue' : 'red';
  const currentPlayer = maximizing ? aiPlayer : opp;
  const moves = getAllMoves(board);
  if (moves.length === 0) return score;

  if (maximizing) {
    let best = -Infinity;
    for (const [r, c] of moves) {
      board[r][c] = currentPlayer;
      const val = minimax(board, depth - 1, alpha, beta, false, aiPlayer, evalFn);
      board[r][c] = null;
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [r, c] of moves) {
      board[r][c] = currentPlayer;
      const val = minimax(board, depth - 1, alpha, beta, true, aiPlayer, evalFn);
      board[r][c] = null;
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

// Sort moves: prioritize center, then adjacency to existing friendly stones
function sortMovesBasic(moves) {
  const center = (SIZE - 1) / 2;
  return [...moves].sort((a, b) => {
    const da = Math.abs(a[0] - center) + Math.abs(a[1] - center);
    const db = Math.abs(b[0] - center) + Math.abs(b[1] - center);
    return da - db;
  });
}

// Advanced move ordering for hard mode: scores each move by multiple heuristics
function sortMovesAdvanced(moves, board, player) {
  const opp = player === 'red' ? 'blue' : 'red';
  const center = (SIZE - 1) / 2;

  // Pre-compute: which cells are adjacent to existing friendly/enemy stones
  const scored = moves.map(([r, c]) => {
    let friendlyAdj = 0;
    let enemyAdj = 0;
    for (const [dr, dc] of NEIGHBOURS) {
      const nr = r + dr, nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      if (board[nr][nc] === player) friendlyAdj++;
      else if (board[nr][nc] === opp) enemyAdj++;
    }

    // Distance from center (lower is better)
    const centerDist = Math.abs(r - center) + Math.abs(c - center);

    // Score: adjacent to friendly stones is great (extending connections),
    // adjacent to enemy is good (blocking), center is good
    const score = friendlyAdj * 3 + enemyAdj * 2 - centerDist * 0.5;
    return { move: [r, c], score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.move);
}

// Iterative deepening with time limit for hard mode
function searchWithTimeLimit(board, maxDepth, aiPlayer, timeLimitMs) {
  const moves = sortMovesAdvanced(getAllMoves(board), board, aiPlayer);
  if (moves.length === 0) return null;

  const startTime = Date.now();
  let bestMove = moves[0];
  let bestVal = -Infinity;

  // Iterative deepening: try depth 1, 2, 3, ... up to maxDepth
  for (let depth = 1; depth <= maxDepth; depth++) {
    let depthBest = moves[0];
    let depthBestVal = -Infinity;
    let aborted = false;

    for (const [r, c] of moves) {
      if (Date.now() - startTime > timeLimitMs) { aborted = true; break; }

      board[r][c] = aiPlayer;
      const val = minimaxTimed(board, depth - 1, -Infinity, Infinity, false, aiPlayer, startTime, timeLimitMs);
      board[r][c] = null;

      if (val === null) { aborted = true; break; } // timed out
      if (val > depthBestVal) {
        depthBestVal = val;
        depthBest = [r, c];
      }
    }

    if (!aborted) {
      bestMove = depthBest;
      bestVal = depthBestVal;
      // If we found a winning move, stop searching
      if (bestVal >= 100000) break;
    } else {
      break;
    }
  }

  return bestMove;
}

function minimaxTimed(board, depth, alpha, beta, maximizing, aiPlayer, startTime, timeLimitMs) {
  if (Date.now() - startTime > timeLimitMs) return null;

  const score = evaluateAdvanced(board, aiPlayer);
  if (Math.abs(score) >= 100000 || depth === 0) return score;

  const opp = aiPlayer === 'red' ? 'blue' : 'red';
  const currentPlayer = maximizing ? aiPlayer : opp;
  const moves = getAllMoves(board);
  if (moves.length === 0) return score;

  // Light move ordering at internal nodes too — sort by adjacency
  const orderedMoves = sortMovesLight(moves, board, currentPlayer);

  if (maximizing) {
    let best = -Infinity;
    for (const [r, c] of orderedMoves) {
      board[r][c] = currentPlayer;
      const val = minimaxTimed(board, depth - 1, alpha, beta, false, aiPlayer, startTime, timeLimitMs);
      board[r][c] = null;
      if (val === null) return null;
      if (val > best) best = val;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [r, c] of orderedMoves) {
      board[r][c] = currentPlayer;
      const val = minimaxTimed(board, depth - 1, alpha, beta, true, aiPlayer, startTime, timeLimitMs);
      board[r][c] = null;
      if (val === null) return null;
      if (val < best) best = val;
      if (best < beta) beta = best;
      if (alpha >= beta) break;
    }
    return best;
  }
}

// Lightweight move ordering for internal nodes (fast — no evaluation calls)
function sortMovesLight(moves, board, player) {
  const center = (SIZE - 1) / 2;
  const scored = new Array(moves.length);
  for (let i = 0; i < moves.length; i++) {
    const [r, c] = moves[i];
    let adj = 0;
    for (const [dr, dc] of NEIGHBOURS) {
      const nr = r + dr, nc = c + dc;
      if (inBounds(nr, nc) && board[nr][nc] === player) adj++;
    }
    const centerDist = Math.abs(r - center) + Math.abs(c - center);
    scored[i] = { move: moves[i], score: adj * 3 - centerDist * 0.3 };
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.move);
}

export function getAIMove(state, player, difficulty = 'medium') {
  const moves = getAllMoves(state.board);
  if (moves.length === 0) return null;

  if (difficulty === 'easy') {
    return shuffle(moves)[0];
  }

  if (difficulty === 'hard') {
    // Make a mutable copy for in-place move/unmove
    const board = state.board.map(row => [...row]);
    // Iterative deepening up to depth 4, with 3-second time limit
    return searchWithTimeLimit(board, 4, player, 3000);
  }

  // Medium: depth 2 with basic eval, center-sorted moves
  const depth = 2;
  const candidates = sortMovesBasic(moves);
  const board = state.board.map(row => [...row]);

  let bestMove = candidates[0];
  let bestVal = -Infinity;

  for (const [r, c] of candidates) {
    board[r][c] = player;
    const val = minimax(board, depth - 1, -Infinity, Infinity, false, player, evaluate);
    board[r][c] = null;
    if (val > bestVal) {
      bestVal = val;
      bestMove = [r, c];
    }
  }
  return bestMove;
}

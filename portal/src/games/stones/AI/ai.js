// ai.js — Pente AI (minimax with alpha-beta)
import { getCandidates, applyMove, evaluate } from '../Game.js';

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Quick score for move ordering — try each candidate, evaluate, sort by score desc
function orderCandidates(state, cands, aiPlayer) {
  return cands
    .map(([r, c]) => {
      const next = applyMove(state, r, c);
      return { rc: [r, c], score: evaluate(next, aiPlayer) };
    })
    .sort((a, b) => b.score - a.score)
    .map(x => x.rc);
}

function minimax(state, depth, alpha, beta, maximizing, aiPlayer) {
  const score = evaluate(state, aiPlayer);
  if (Math.abs(score) >= 100000 || depth === 0 || state.winner) return score;
  const cands = getCandidates(state.board);
  if (cands.length === 0) return score;

  const limited = cands.slice(0, 20);

  if (maximizing) {
    let best = -Infinity;
    for (const [r, c] of limited) {
      const val = minimax(applyMove(state, r, c), depth - 1, alpha, beta, false, aiPlayer);
      if (val > best) best = val;
      alpha = Math.max(alpha, best);
      if (alpha >= beta) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const [r, c] of limited) {
      const val = minimax(applyMove(state, r, c), depth - 1, alpha, beta, true, aiPlayer);
      if (val < best) best = val;
      beta = Math.min(beta, best);
      if (alpha >= beta) break;
    }
    return best;
  }
}

// Check for immediate winning move or must-block threat
function findUrgentMove(state, cands, aiPlayer) {
  const opp = aiPlayer === 'black' ? 'white' : 'black';
  // 1. Can AI win immediately?
  for (const [r, c] of cands) {
    const next = applyMove(state, r, c);
    if (next.winner === aiPlayer) return [r, c];
  }
  // 2. Can opponent win on their next move? Block it.
  const oppState = { ...state, currentPlayer: opp };
  for (const [r, c] of cands) {
    const next = applyMove(oppState, r, c);
    if (next.winner === opp) return [r, c];
  }
  return null;
}

export function getAIMove(state, player, difficulty = 'medium') {
  const cands = getCandidates(state.board);
  if (cands.length === 0) return null;
  if (difficulty === 'easy') return shuffle(cands)[0];

  // Always check for immediate wins/blocks first (even on medium)
  const urgent = findUrgentMove(state, cands, player);
  if (urgent) return urgent;

  const depth = difficulty === 'hard' ? 4 : 2;
  // Order candidates by quick evaluation so blocking/winning moves come first
  const ordered = orderCandidates(state, cands, player);
  const limited = ordered.slice(0, difficulty === 'hard' ? 30 : 25);

  let bestMove = limited[0], bestVal = -Infinity;
  for (const [r, c] of limited) {
    const val = minimax(applyMove(state, r, c), depth - 1, -Infinity, Infinity, false, player);
    if (val > bestVal) { bestVal = val; bestMove = [r, c]; }
  }
  return bestMove;
}

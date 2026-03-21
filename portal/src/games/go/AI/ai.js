// ai.js — Go AI using shared MCTS engine
import { getLegalMoves as goGetLegalMoves, applyMove, applyPass, evaluate } from '../Game.js';
import { mctsSearch } from '../../../AI/mcts.js';

// MCTS game interface for Go
const goInterface = {
  getLegalMoves(state) {
    const moves = goGetLegalMoves(state);
    // Include pass as a move option
    moves.push([-1, -1]);
    return moves;
  },

  applyMove(state, move) {
    if (move[0] === -1 && move[1] === -1) {
      return applyPass(state);
    }
    return applyMove(state, move[0], move[1]);
  },

  isTerminal(state) {
    return state.winner !== null;
  },

  getResult(state, player) {
    if (!state.winner) return 0;
    if (state.winner === 'draw') return 0;
    return state.winner === player ? 1 : -1;
  },

  getCurrentPlayer(state) {
    return state.turn;
  },

  evaluate(state, player) {
    return evaluate(state, player);
  },
};

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getAIMove(state, player, difficulty = 'medium') {
  const moves = goGetLegalMoves(state);
  if (moves.length === 0) return [-1, -1]; // pass

  if (difficulty === 'easy') {
    // Mix of random moves and passes
    if (moves.length > 0 && Math.random() > 0.1) {
      return shuffle([...moves])[0];
    }
    return [-1, -1];
  }

  const iterations = difficulty === 'hard' ? 3000 : 1000;
  const timeLimit = difficulty === 'hard' ? 4000 : 2000;

  const move = mctsSearch(state, goInterface, {
    iterations,
    timeLimit,
    useEval: true,
  });

  if (!move) return [-1, -1];
  return move;
}

// Game.js — Othello/Reversi core logic (pure, no React)
// 8×8 square board. Win by having the most discs when no moves remain.

export const SIZE = 8;
export const DIRS8 = [[1,0],[0,1],[1,1],[1,-1],[-1,0],[0,-1],[-1,-1],[-1,1]];

export function initState({ vsAI = false, aiPlayer = 'white', difficulty = 'medium',
                            p1Color = '#222', p2Color = '#f5f5f0' } = {}) {
  const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
  // Standard Othello opening: 4 discs in center
  board[3][3] = 'white'; board[3][4] = 'black';
  board[4][3] = 'black'; board[4][4] = 'white';
  return {
    board,
    currentPlayer: 'black',
    winner: null,
    moveCount: 0,
    passCount: 0, // consecutive passes; 2 = game over
    vsAI, aiPlayer, difficulty, p1Color, p2Color,
  };
}

// Returns list of [r, c] positions that would be flipped if player places at (row, col)
export function getFlips(board, row, col, player) {
  if (board[row][col]) return [];
  const opp = player === 'black' ? 'white' : 'black';
  const allFlips = [];
  for (const [dr, dc] of DIRS8) {
    const lineFlips = [];
    let r = row + dr, c = col + dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === opp) {
      lineFlips.push([r, c]);
      r += dr; c += dc;
    }
    if (lineFlips.length > 0 && r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === player) {
      allFlips.push(...lineFlips);
    }
  }
  return allFlips;
}

export function getLegalMoves(board, player) {
  const moves = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (getFlips(board, r, c, player).length > 0) moves.push([r, c]);
  return moves;
}

export function applyMove(state, row, col) {
  if (state.winner) return state;
  const player = state.currentPlayer;
  const flips = getFlips(state.board, row, col, player);
  if (flips.length === 0) return state; // illegal move

  const board = state.board.map(r => [...r]);
  board[row][col] = player;
  for (const [r, c] of flips) board[r][c] = player;

  const opp = player === 'black' ? 'white' : 'black';
  const oppMoves = getLegalMoves(board, opp);
  let nextPlayer, passCount;

  if (oppMoves.length > 0) {
    nextPlayer = opp;
    passCount = 0;
  } else {
    // Opponent must pass; check if current player can move
    const curMoves = getLegalMoves(board, player);
    if (curMoves.length > 0) {
      nextPlayer = player;
      passCount = 1;
    } else {
      // Neither can move — game over
      return finalize({ ...state, board, moveCount: (state.moveCount || 0) + 1, passCount: 2 });
    }
  }

  return { ...state, board, currentPlayer: nextPlayer, passCount, moveCount: (state.moveCount || 0) + 1 };
}

export function applyPass(state) {
  if (state.winner) return state;
  const opp = state.currentPlayer === 'black' ? 'white' : 'black';
  const newPassCount = state.passCount + 1;
  if (newPassCount >= 2) return finalize({ ...state, passCount: newPassCount });
  return { ...state, currentPlayer: opp, passCount: newPassCount };
}

function finalize(state) {
  const counts = countDiscs(state.board);
  let winner;
  if (counts.black > counts.white) winner = 'black';
  else if (counts.white > counts.black) winner = 'white';
  else winner = 'draw';
  return { ...state, winner };
}

export function countDiscs(board) {
  let black = 0, white = 0;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 'black') black++;
      else if (board[r][c] === 'white') white++;
    }
  return { black, white };
}

// --- AI evaluation ---

const POSITION_WEIGHTS = [
  [120, -20,  20,   5,   5,  20, -20, 120],
  [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
  [ 20,  -5,  15,   3,   3,  15,  -5,  20],
  [  5,  -5,   3,   3,   3,   3,  -5,   5],
  [  5,  -5,   3,   3,   3,   3,  -5,   5],
  [ 20,  -5,  15,   3,   3,  15,  -5,  20],
  [-20, -40,  -5,  -5,  -5,  -5, -40, -20],
  [120, -20,  20,   5,   5,  20, -20, 120],
];

export function evaluate(state, player) {
  if (state.winner === player) return 100000;
  if (state.winner && state.winner !== 'draw') return -100000;
  if (state.winner === 'draw') return 0;

  const opp = player === 'black' ? 'white' : 'black';
  let score = 0;

  // Positional score
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (state.board[r][c] === player) score += POSITION_WEIGHTS[r][c];
      else if (state.board[r][c] === opp) score -= POSITION_WEIGHTS[r][c];
    }

  // Mobility: number of legal moves advantage
  const myMoves = getLegalMoves(state.board, player).length;
  const oppMoves = getLegalMoves(state.board, opp).length;
  score += (myMoves - oppMoves) * 10;

  // Disc parity (weighted more in endgame)
  const counts = countDiscs(state.board);
  const totalDiscs = counts.black + counts.white;
  if (totalDiscs > 50) {
    score += (counts[player] - counts[opp]) * 5;
  }

  return score;
}

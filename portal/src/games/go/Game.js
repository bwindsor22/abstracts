// Game.js — Go core logic (pure, no React)
// 9×9 board, captures, ko rule, scoring (area scoring)

export const SIZE = 9;

export function initState({ vsAI = true, aiPlayer = 'white', difficulty = 'medium' } = {}) {
  return {
    board: Array.from({ length: SIZE }, () => Array(SIZE).fill(null)),
    turn: 'black', // black goes first
    captures: { black: 0, white: 0 }, // stones captured by each player
    ko: null, // [r, c] that is forbidden due to ko
    passes: 0, // consecutive passes
    winner: null,
    moveCount: 0,
    vsAI, aiPlayer, difficulty,
    lastMove: null, // [r, c] or 'pass'
    history: [], // board hashes for superko (simplified)
  };
}

function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }

const NEIGHBORS = [[0, 1], [0, -1], [1, 0], [-1, 0]];

// Find the group connected to (r, c) and its liberties
function getGroup(board, r, c) {
  const color = board[r][c];
  if (!color) return { stones: [], liberties: new Set() };
  const visited = new Set();
  const stones = [];
  const liberties = new Set();
  const stack = [[r, c]];
  while (stack.length > 0) {
    const [cr, cc] = stack.pop();
    const key = cr * SIZE + cc;
    if (visited.has(key)) continue;
    visited.add(key);
    stones.push([cr, cc]);
    for (const [dr, dc] of NEIGHBORS) {
      const nr = cr + dr, nc = cc + dc;
      if (!inBounds(nr, nc)) continue;
      if (board[nr][nc] === null) {
        liberties.add(nr * SIZE + nc);
      } else if (board[nr][nc] === color && !visited.has(nr * SIZE + nc)) {
        stack.push([nr, nc]);
      }
    }
  }
  return { stones, liberties };
}

function boardHash(board) {
  let h = '';
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      h += board[r][c] === 'black' ? 'b' : board[r][c] === 'white' ? 'w' : '.';
  return h;
}

// Check if a move is legal (not suicide, not ko)
export function isLegal(state, r, c) {
  if (!inBounds(r, c) || state.board[r][c] !== null) return false;
  if (state.ko && state.ko[0] === r && state.ko[1] === c) return false;

  // Try placing the stone
  const board = state.board.map(row => [...row]);
  board[r][c] = state.turn;
  const opp = state.turn === 'black' ? 'white' : 'black';

  // Check if it captures something
  let captures = 0;
  for (const [dr, dc] of NEIGHBORS) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc) && board[nr][nc] === opp) {
      const group = getGroup(board, nr, nc);
      if (group.liberties.size === 0) captures += group.stones.length;
    }
  }

  // If no captures, check if own group has liberties (suicide check)
  if (captures === 0) {
    const ownGroup = getGroup(board, r, c);
    if (ownGroup.liberties.size === 0) return false;
  }

  return true;
}

export function getLegalMoves(state) {
  const moves = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (isLegal(state, r, c)) moves.push([r, c]);
  return moves;
}

export function applyMove(state, r, c) {
  // Pass
  if (r === -1 && c === -1) {
    return applyPass(state);
  }

  if (!isLegal(state, r, c)) return state;

  const board = state.board.map(row => [...row]);
  const turn = state.turn;
  const opp = turn === 'black' ? 'white' : 'black';
  board[r][c] = turn;

  const captures = { ...state.captures };
  let capturedStones = [];

  // Remove captured groups
  for (const [dr, dc] of NEIGHBORS) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc) && board[nr][nc] === opp) {
      const group = getGroup(board, nr, nc);
      if (group.liberties.size === 0) {
        for (const [sr, sc] of group.stones) {
          board[sr][sc] = null;
          capturedStones.push([sr, sc]);
        }
        captures[turn] += group.stones.length;
      }
    }
  }

  // Ko detection: if exactly 1 stone captured and the placed stone has exactly 1 liberty
  let ko = null;
  if (capturedStones.length === 1) {
    const ownGroup = getGroup(board, r, c);
    if (ownGroup.stones.length === 1 && ownGroup.liberties.size === 1) {
      ko = capturedStones[0];
    }
  }

  return {
    ...state,
    board, turn: opp, captures, ko,
    passes: 0,
    moveCount: state.moveCount + 1,
    lastMove: [r, c],
    history: [...state.history, boardHash(board)],
  };
}

export function applyPass(state) {
  const opp = state.turn === 'black' ? 'white' : 'black';
  const newPasses = state.passes + 1;

  if (newPasses >= 2) {
    // Game over — score
    return scoreGame({ ...state, turn: opp, passes: newPasses, ko: null, lastMove: 'pass' });
  }

  return {
    ...state,
    turn: opp,
    passes: newPasses,
    ko: null,
    moveCount: state.moveCount + 1,
    lastMove: 'pass',
  };
}

// Area scoring (Chinese rules, simpler)
export function scoreGame(state) {
  const board = state.board.map(row => [...row]);
  const territory = { black: 0, white: 0 };
  const stones = { black: 0, white: 0 };

  // Count stones
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (board[r][c]) stones[board[r][c]]++;

  // Flood-fill empty regions to determine territory
  const visited = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (visited[r][c] || board[r][c] !== null) continue;
      const region = [];
      const borders = new Set();
      const stack = [[r, c]];
      while (stack.length > 0) {
        const [cr, cc] = stack.pop();
        if (visited[cr][cc]) continue;
        visited[cr][cc] = true;
        region.push([cr, cc]);
        for (const [dr, dc] of NEIGHBORS) {
          const nr = cr + dr, nc = cc + dc;
          if (!inBounds(nr, nc)) continue;
          if (board[nr][nc] === null && !visited[nr][nc]) stack.push([nr, nc]);
          else if (board[nr][nc] !== null) borders.add(board[nr][nc]);
        }
      }
      // If bordered by only one color, it's that color's territory
      if (borders.size === 1) {
        const owner = [...borders][0];
        territory[owner] += region.length;
      }
    }
  }

  const KOMI = 6.5; // compensation for white
  const blackScore = stones.black + territory.black;
  const whiteScore = stones.white + territory.white + KOMI;

  const winner = blackScore > whiteScore ? 'black'
    : whiteScore > blackScore ? 'white' : 'draw';

  return {
    ...state,
    winner,
    score: { black: blackScore, white: whiteScore },
    territory,
  };
}

// Simple evaluation for MCTS leaf evaluation
export function evaluate(state, player) {
  // Count stones + influence
  let score = 0;
  const opp = player === 'black' ? 'white' : 'black';
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (state.board[r][c] === player) score += 1;
      else if (state.board[r][c] === opp) score -= 1;
    }
  }
  // Add captures
  score += (state.captures[player] || 0) - (state.captures[opp] || 0);
  // Komi adjustment
  if (player === 'white') score += 6.5;
  else score -= 6.5;
  return score / 81; // normalize to roughly [-1, 1]
}

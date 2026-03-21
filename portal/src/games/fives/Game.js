// Game.js — Gomoku (Five in a Row) core logic (pure, no React)
// 13×13 intersection-based board. Win by getting exactly 5 in a row.

export const SIZE = 13;
export const DIRS8 = [[1,0],[0,1],[1,1],[1,-1],[-1,0],[0,-1],[-1,-1],[-1,1]];
export const DIRS4 = [[1,0],[0,1],[1,1],[1,-1]];

export function initState({ vsAI = false, aiPlayer = 'white', difficulty = 'medium',
                            p1Color = '#222', p2Color = '#f5f5f0' } = {}) {
  return {
    board: Array.from({ length: SIZE }, () => Array(SIZE).fill(null)),
    currentPlayer: 'black',
    winner: null,
    moveCount: 0,
    vsAI, aiPlayer, difficulty, p1Color, p2Color,
  };
}

export function applyMove(state, row, col) {
  if (state.winner || state.board[row][col]) return state;
  const board = state.board.map(r => [...r]);
  const player = state.currentPlayer;
  board[row][col] = player;

  const winner = checkFive(board, player, row, col);
  const next = player === 'black' ? 'white' : 'black';

  // Check draw: board full with no winner
  let draw = false;
  if (!winner) {
    draw = true;
    outer: for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (!board[r][c]) { draw = false; break outer; }
  }

  return {
    ...state, board, winner: winner || (draw ? 'draw' : null),
    currentPlayer: winner || draw ? state.currentPlayer : next,
    moveCount: (state.moveCount || 0) + 1,
  };
}

function checkFive(board, player, row, col) {
  for (const [dr, dc] of DIRS4) {
    let count = 1;
    for (let s = 1; s < 5; s++) {
      const r = row + dr * s, c = col + dc * s;
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === player) count++; else break;
    }
    for (let s = 1; s < 5; s++) {
      const r = row - dr * s, c = col - dc * s;
      if (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === player) count++; else break;
    }
    if (count >= 5) return player;
  }
  return null;
}

export function evaluate(state, player) {
  if (state.winner === player) return 100000;
  if (state.winner && state.winner !== 'draw') return -100000;
  if (state.winner === 'draw') return 0;
  const opp = player === 'black' ? 'white' : 'black';
  let score = 0;
  const b = state.board;

  for (const [dr, dc] of DIRS4) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        for (const p of [player, opp]) {
          if (b[r][c] !== p) continue;
          const pr = r - dr, pc = c - dc;
          if (pr >= 0 && pr < SIZE && pc >= 0 && pc < SIZE && b[pr][pc] === p) continue;

          let len = 0;
          let nr = r, nc = c;
          while (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && b[nr][nc] === p) {
            len++; nr += dr; nc += dc;
          }
          if (len === 0) continue;
          if (len >= 5) { score += p === player ? 100000 : -100000; continue; }

          let openEnds = 0;
          if (pr >= 0 && pr < SIZE && pc >= 0 && pc < SIZE && b[pr][pc] === null) openEnds++;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && b[nr][nc] === null) openEnds++;

          const mul = p === player ? 1 : -1.3;
          if (len === 4) {
            if (openEnds === 2) score += mul * 50000;
            else if (openEnds === 1) score += mul * 8000;
          } else if (len === 3) {
            if (openEnds === 2) score += mul * 800;
            else if (openEnds === 1) score += mul * 80;
          } else if (len === 2) {
            if (openEnds === 2) score += mul * 30;
            else if (openEnds === 1) score += mul * 5;
          } else if (len === 1) {
            score += mul * 1;
          }
        }
      }
    }
  }
  return score;
}

export function getCandidates(board) {
  let hasAny = false;
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (board[r][c]) { hasAny = true; break; }
  if (!hasAny) return [[SIZE >> 1, SIZE >> 1]];
  const cands = new Set();
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++) {
      if (!board[r][c]) continue;
      for (const [dr, dc] of DIRS8) {
        for (let d = 1; d <= 2; d++) {
          const nr = r + dr * d, nc = c + dc * d;
          if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE && !board[nr][nc]) cands.add(`${nr},${nc}`);
        }
      }
    }
  return [...cands].map(k => k.split(',').map(Number));
}

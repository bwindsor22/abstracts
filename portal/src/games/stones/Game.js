// Game.js — Pente core logic (pure, no React)
// 19×19 Go-like board. Win by 5-in-a-row OR 5 captures (captured pairs).

export const SIZE = 19;
export const DIRS8 = [[1,0],[0,1],[1,1],[1,-1],[-1,0],[0,-1],[-1,-1],[-1,1]];
export const DIRS4 = [[1,0],[0,1],[1,1],[1,-1]];

export function initState({ vsAI = false, aiPlayer = 'white', difficulty = 'medium',
                            p1Color = '#222', p2Color = '#f5f5f0' } = {}) {
  return {
    board: Array.from({ length: SIZE }, () => Array(SIZE).fill(null)),
    currentPlayer: 'black',
    captures: { black: 0, white: 0 }, // pairs captured; win at 5
    winner: null,
    vsAI, aiPlayer, difficulty, p1Color, p2Color,
  };
}

export function applyMove(state, row, col) {
  if (state.winner || state.board[row][col]) return state;
  const board = state.board.map(r => [...r]);
  const player = state.currentPlayer;
  const opp = player === 'black' ? 'white' : 'black';
  board[row][col] = player;

  let capCount = state.captures[player];
  for (const [dr, dc] of DIRS8) {
    const r1=row+dr, c1=col+dc, r2=row+2*dr, c2=col+2*dc, r3=row+3*dr, c3=col+3*dc;
    if (r3 >= 0 && r3 < SIZE && c3 >= 0 && c3 < SIZE &&
        board[r1]?.[c1] === opp && board[r2]?.[c2] === opp && board[r3]?.[c3] === player) {
      board[r1][c1] = null;
      board[r2][c2] = null;
      capCount++;
    }
  }

  const captures = { ...state.captures, [player]: capCount };
  let winner = capCount >= 5 ? player : checkFive(board, player, row, col);
  const next = player === 'black' ? 'white' : 'black';
  return { ...state, board, captures, winner, currentPlayer: winner ? player : next };
}

function checkFive(board, player, row, col) {
  for (const [dr, dc] of DIRS4) {
    let count = 1;
    for (let s = 1; s < 5; s++) {
      const r=row+dr*s, c=col+dc*s;
      if (r>=0&&r<SIZE&&c>=0&&c<SIZE&&board[r][c]===player) count++; else break;
    }
    for (let s = 1; s < 5; s++) {
      const r=row-dr*s, c=col-dc*s;
      if (r>=0&&r<SIZE&&c>=0&&c<SIZE&&board[r][c]===player) count++; else break;
    }
    if (count >= 5) return player;
  }
  return null;
}

export function evaluate(state, player) {
  if (state.winner === player) return 100000;
  if (state.winner) return -100000;
  const opp = player === 'black' ? 'white' : 'black';
  let score = (state.captures[player] - state.captures[opp]) * 200;
  const b = state.board;
  const WEIGHTS = [0, 1, 10, 60, 500, 100000];
  for (const [dr, dc] of DIRS4) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        for (const p of [player, opp]) {
          if (b[r][c] !== p) continue;
          let len = 0;
          while (len < 5) {
            const nr=r+dr*len, nc=c+dc*len;
            if (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&b[nr][nc]===p) len++; else break;
          }
          if (len > 0) score += p === player ? WEIGHTS[len] : -WEIGHTS[len] * 1.2;
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
        const nr=r+dr, nc=c+dc;
        if (nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE&&!board[nr][nc]) cands.add(`${nr},${nc}`);
      }
    }
  return [...cands].map(k => k.split(',').map(Number));
}

// Game.js — Chess core logic (pure, no React)
// Standard chess rules: all pieces, castling, en passant, promotion, check/checkmate/stalemate

export const SIZE = 8;

// Piece encoding: 'wK','wQ','wR','wB','wN','wP','bK','bQ','bR','bB','bN','bP'
const PIECE_VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };

// Piece-square tables (from white's perspective, flip for black)
const PST = {
  P: [
     0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
     5,  5, 10, 25, 25, 10,  5,  5,
     0,  0,  0, 20, 20,  0,  0,  0,
     5, -5,-10,  0,  0,-10, -5,  5,
     5, 10, 10,-20,-20, 10, 10,  5,
     0,  0,  0,  0,  0,  0,  0,  0,
  ],
  N: [
   -50,-40,-30,-30,-30,-30,-40,-50,
   -40,-20,  0,  0,  0,  0,-20,-40,
   -30,  0, 10, 15, 15, 10,  0,-30,
   -30,  5, 15, 20, 20, 15,  5,-30,
   -30,  0, 15, 20, 20, 15,  0,-30,
   -30,  5, 10, 15, 15, 10,  5,-30,
   -40,-20,  0,  5,  5,  0,-20,-40,
   -50,-40,-30,-30,-30,-30,-40,-50,
  ],
  B: [
   -20,-10,-10,-10,-10,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0, 10, 10, 10, 10,  0,-10,
   -10,  5,  5, 10, 10,  5,  5,-10,
   -10,  0, 10, 10, 10, 10,  0,-10,
   -10, 10, 10, 10, 10, 10, 10,-10,
   -10,  5,  0,  0,  0,  0,  5,-10,
   -20,-10,-10,-10,-10,-10,-10,-20,
  ],
  R: [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
   -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0,
  ],
  Q: [
   -20,-10,-10, -5, -5,-10,-10,-20,
   -10,  0,  0,  0,  0,  0,  0,-10,
   -10,  0,  5,  5,  5,  5,  0,-10,
    -5,  0,  5,  5,  5,  5,  0, -5,
     0,  0,  5,  5,  5,  5,  0, -5,
   -10,  5,  5,  5,  5,  5,  0,-10,
   -10,  0,  5,  0,  0,  0,  0,-10,
   -20,-10,-10, -5, -5,-10,-10,-20,
  ],
  K: [
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -30,-40,-40,-50,-50,-40,-40,-30,
   -20,-30,-30,-40,-40,-30,-30,-20,
   -10,-20,-20,-20,-20,-20,-20,-10,
    20, 20,  0,  0,  0,  0, 20, 20,
    20, 30, 10,  0,  0, 10, 30, 20,
  ],
};

function pstIndex(r, c, color) {
  return color === 'w' ? r * 8 + c : (7 - r) * 8 + c;
}

export function initState({ vsAI = true, aiPlayer = 'b', difficulty = 'medium' } = {}) {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  const backRank = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = 'b' + backRank[c];
    board[1][c] = 'bP';
    board[6][c] = 'wP';
    board[7][c] = 'w' + backRank[c];
  }
  return {
    board,
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true }, // can still castle?
    enPassant: null, // [r, c] of en passant target square
    halfMoves: 0,
    moveCount: 0,
    winner: null,
    vsAI, aiPlayer, difficulty,
    lastMove: null, // { from: [r,c], to: [r,c] }
  };
}

function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

function colorOf(piece) { return piece ? piece[0] : null; }
function typeOf(piece) { return piece ? piece[1] : null; }

// Generate pseudo-legal moves for a piece at (r, c)
function pieceMoves(board, r, c, castling, enPassant) {
  const piece = board[r][c];
  if (!piece) return [];
  const color = piece[0];
  const type = piece[1];
  const opp = color === 'w' ? 'b' : 'w';
  const moves = [];

  const addMove = (tr, tc, flag) => {
    if (!inBounds(tr, tc)) return;
    const target = board[tr][tc];
    if (target && colorOf(target) === color) return;
    moves.push({ from: [r, c], to: [tr, tc], flag });
  };

  const slideDirs = (dirs) => {
    for (const [dr, dc] of dirs) {
      for (let d = 1; d < 8; d++) {
        const tr = r + dr * d, tc = c + dc * d;
        if (!inBounds(tr, tc)) break;
        const target = board[tr][tc];
        if (target) {
          if (colorOf(target) === opp) moves.push({ from: [r, c], to: [tr, tc] });
          break;
        }
        moves.push({ from: [r, c], to: [tr, tc] });
      }
    }
  };

  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    const promoRow = color === 'w' ? 0 : 7;
    // Forward
    if (inBounds(r + dir, c) && !board[r + dir][c]) {
      if (r + dir === promoRow) {
        for (const p of ['Q', 'R', 'B', 'N']) moves.push({ from: [r, c], to: [r + dir, c], promo: p });
      } else {
        moves.push({ from: [r, c], to: [r + dir, c] });
      }
      // Double push
      if (r === startRow && !board[r + 2 * dir][c]) {
        moves.push({ from: [r, c], to: [r + 2 * dir, c], flag: 'double' });
      }
    }
    // Captures
    for (const dc of [-1, 1]) {
      const tr = r + dir, tc = c + dc;
      if (!inBounds(tr, tc)) continue;
      if (board[tr][tc] && colorOf(board[tr][tc]) === opp) {
        if (tr === promoRow) {
          for (const p of ['Q', 'R', 'B', 'N']) moves.push({ from: [r, c], to: [tr, tc], promo: p });
        } else {
          moves.push({ from: [r, c], to: [tr, tc] });
        }
      }
      // En passant
      if (enPassant && enPassant[0] === tr && enPassant[1] === tc) {
        moves.push({ from: [r, c], to: [tr, tc], flag: 'ep' });
      }
    }
  } else if (type === 'N') {
    for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
      addMove(r + dr, c + dc);
    }
  } else if (type === 'B') {
    slideDirs([[-1,-1],[-1,1],[1,-1],[1,1]]);
  } else if (type === 'R') {
    slideDirs([[-1,0],[1,0],[0,-1],[0,1]]);
  } else if (type === 'Q') {
    slideDirs([[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
  } else if (type === 'K') {
    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      addMove(r + dr, c + dc);
    }
    // Castling
    const row = color === 'w' ? 7 : 0;
    if (r === row && c === 4) {
      // Kingside
      if (castling[color + 'K'] && board[row][5] === null && board[row][6] === null && board[row][7] === color + 'R') {
        if (!isSquareAttacked(board, row, 4, opp) && !isSquareAttacked(board, row, 5, opp) && !isSquareAttacked(board, row, 6, opp)) {
          moves.push({ from: [r, c], to: [row, 6], flag: 'castleK' });
        }
      }
      // Queenside
      if (castling[color + 'Q'] && board[row][3] === null && board[row][2] === null && board[row][1] === null && board[row][0] === color + 'R') {
        if (!isSquareAttacked(board, row, 4, opp) && !isSquareAttacked(board, row, 3, opp) && !isSquareAttacked(board, row, 2, opp)) {
          moves.push({ from: [r, c], to: [row, 2], flag: 'castleQ' });
        }
      }
    }
  }
  return moves;
}

function isSquareAttacked(board, r, c, byColor) {
  // Check all pieces of byColor for attacks on (r, c)
  const opp = byColor;
  // Knight attacks
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc) && board[nr][nc] === opp + 'N') return true;
  }
  // King attacks
  for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    const nr = r + dr, nc = c + dc;
    if (inBounds(nr, nc) && board[nr][nc] === opp + 'K') return true;
  }
  // Pawn attacks
  const pawnDir = opp === 'w' ? 1 : -1; // pawns attack in opposite direction
  for (const dc of [-1, 1]) {
    const nr = r + pawnDir, nc = c + dc;
    if (inBounds(nr, nc) && board[nr][nc] === opp + 'P') return true;
  }
  // Sliding: bishop/queen diagonals
  for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
    for (let d = 1; d < 8; d++) {
      const nr = r + dr * d, nc = c + dc * d;
      if (!inBounds(nr, nc)) break;
      const p = board[nr][nc];
      if (p) {
        if (p === opp + 'B' || p === opp + 'Q') return true;
        break;
      }
    }
  }
  // Sliding: rook/queen straights
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    for (let d = 1; d < 8; d++) {
      const nr = r + dr * d, nc = c + dc * d;
      if (!inBounds(nr, nc)) break;
      const p = board[nr][nc];
      if (p) {
        if (p === opp + 'R' || p === opp + 'Q') return true;
        break;
      }
    }
  }
  return false;
}

function findKing(board, color) {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] === color + 'K') return [r, c];
  return null;
}

export function isInCheck(board, color) {
  const king = findKing(board, color);
  if (!king) return false;
  const opp = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(board, king[0], king[1], opp);
}

// Apply move and return new board (does NOT check legality)
function rawApply(board, move, castling, enPassant, turn) {
  const newBoard = board.map(row => [...row]);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = newBoard[fr][fc];
  const color = piece[0];

  newBoard[tr][tc] = piece;
  newBoard[fr][fc] = null;

  // Promotion
  if (move.promo) {
    newBoard[tr][tc] = color + move.promo;
  }

  // En passant capture
  if (move.flag === 'ep') {
    const capRow = color === 'w' ? tr + 1 : tr - 1;
    newBoard[capRow][tc] = null;
  }

  // Castling
  if (move.flag === 'castleK') {
    const row = color === 'w' ? 7 : 0;
    newBoard[row][5] = newBoard[row][7];
    newBoard[row][7] = null;
  } else if (move.flag === 'castleQ') {
    const row = color === 'w' ? 7 : 0;
    newBoard[row][3] = newBoard[row][0];
    newBoard[row][0] = null;
  }

  return newBoard;
}

// Get all legal moves for the current player
export function getLegalMoves(state) {
  const { board, turn, castling, enPassant } = state;
  const opp = turn === 'w' ? 'b' : 'w';
  const allMoves = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c] && colorOf(board[r][c]) === turn) {
        const moves = pieceMoves(board, r, c, castling, enPassant);
        allMoves.push(...moves);
      }
  // Filter out moves that leave king in check
  return allMoves.filter(move => {
    const newBoard = rawApply(board, move, castling, enPassant, turn);
    return !isInCheck(newBoard, turn);
  });
}

export function applyMove(state, move) {
  const { board, turn, castling, enPassant } = state;
  const opp = turn === 'w' ? 'b' : 'w';
  const newBoard = rawApply(board, move, castling, enPassant, turn);

  // Update castling rights
  const newCastling = { ...castling };
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = board[fr][fc];
  if (typeOf(piece) === 'K') {
    newCastling[turn + 'K'] = false;
    newCastling[turn + 'Q'] = false;
  }
  if (typeOf(piece) === 'R') {
    if (fr === (turn === 'w' ? 7 : 0)) {
      if (fc === 0) newCastling[turn + 'Q'] = false;
      if (fc === 7) newCastling[turn + 'K'] = false;
    }
  }
  // If rook captured
  if (tr === 0 && tc === 0) newCastling.bQ = false;
  if (tr === 0 && tc === 7) newCastling.bK = false;
  if (tr === 7 && tc === 0) newCastling.wQ = false;
  if (tr === 7 && tc === 7) newCastling.wK = false;

  // En passant target
  let newEP = null;
  if (move.flag === 'double') {
    const epRow = turn === 'w' ? fr - 1 : fr + 1;
    newEP = [epRow, fc];
  }

  // Half-move clock
  const isCapture = board[tr][tc] !== null || move.flag === 'ep';
  const isPawn = typeOf(piece) === 'P';
  const newHalfMoves = (isCapture || isPawn) ? 0 : state.halfMoves + 1;

  const newState = {
    ...state,
    board: newBoard,
    turn: opp,
    castling: newCastling,
    enPassant: newEP,
    halfMoves: newHalfMoves,
    moveCount: state.moveCount + 1,
    lastMove: { from: move.from, to: move.to },
  };

  // Check for game end
  const oppMoves = getLegalMoves(newState);
  if (oppMoves.length === 0) {
    if (isInCheck(newBoard, opp)) {
      newState.winner = turn; // checkmate
    } else {
      newState.winner = 'draw'; // stalemate
    }
  } else if (newHalfMoves >= 100) {
    newState.winner = 'draw'; // 50-move rule
  } else if (isInsufficientMaterial(newBoard)) {
    newState.winner = 'draw';
  }

  return newState;
}

function isInsufficientMaterial(board) {
  const pieces = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]) pieces.push(board[r][c]);
  if (pieces.length === 2) return true; // K vs K
  if (pieces.length === 3) {
    const types = pieces.map(p => p[1]);
    if (types.includes('B') || types.includes('N')) return true; // K+B vs K or K+N vs K
  }
  return false;
}

export function evaluate(state, player) {
  if (state.winner === player) return 100000;
  if (state.winner && state.winner !== 'draw' && state.winner !== player) return -100000;
  if (state.winner === 'draw') return 0;

  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece) continue;
      const color = piece[0];
      const type = piece[1];
      const val = PIECE_VALUES[type] + (PST[type] ? PST[type][pstIndex(r, c, color)] : 0);
      score += color === player ? val : -val;
    }
  }
  // Mobility bonus
  const myMoves = getLegalMoves(state).length;
  const oppState = { ...state, turn: state.turn === 'w' ? 'b' : 'w' };
  // Don't compute opponent moves for performance — approximate
  score += (state.turn === player ? myMoves : -myMoves) * 2;

  return score;
}

// Serialize move for comparison
export function moveKey(move) {
  return `${move.from[0]},${move.from[1]}-${move.to[0]},${move.to[1]}${move.promo || ''}`;
}

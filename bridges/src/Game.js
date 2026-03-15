// Game.js — TwixT core logic (pure, no React)
// 24×24 board. Players place pegs and auto-link with knight-move connections.
// Red connects top↔bottom, Blue connects left↔right. Links cannot cross opponent links.

export const SIZE = 24;
export const KNIGHT = [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];

export function inBounds(r, c) { return r >= 0 && r < SIZE && c >= 0 && c < SIZE; }

export function isPlayable(r, c) {
  return inBounds(r,c) && !((r===0||r===SIZE-1) && (c===0||c===SIZE-1));
}

export function canPlace(player, r, c) {
  if (!isPlayable(r,c)) return false;
  if (player === 'red'  && (c === 0 || c === SIZE-1)) return false;
  if (player === 'blue' && (r === 0 || r === SIZE-1)) return false;
  return true;
}

export function initState({ vsAI = false, aiPlayer = 'blue', difficulty = 'medium' } = {}) {
  return {
    board: {},    // 'r,c' → 'red'|'blue'
    links: [],    // [{player, r1,c1,r2,c2}]
    currentPlayer: 'red',
    winner: null,
    moveCount: 0,
    vsAI, aiPlayer, difficulty,
  };
}

// Pi rule (swap rule): after the first peg is placed, the second player may swap sides.
// The first peg changes color to blue and remains where it is; players switch colors.
// After the swap, it is red's turn.
export function applySwap(state) {
  if (state.moveCount !== 1) return state; // only valid after exactly one peg
  // Find the one red peg on the board
  const firstKey = Object.keys(state.board).find(k => state.board[k] === 'red');
  if (!firstKey) return state;
  const board = { ...state.board, [firstKey]: 'blue' };
  // Also add links — the peg is now blue; since it's the only peg, no links yet
  return { ...state, board, currentPlayer: 'red', moveCount: state.moveCount + 1 };
}

function segmentsCross(r1,c1,r2,c2, r3,c3,r4,c4) {
  function sign(p, q, r) { return (q[0]-p[0])*(r[1]-p[1]) - (q[1]-p[1])*(r[0]-p[0]); }
  const A=[r1,c1],B=[r2,c2],C=[r3,c3],D=[r4,c4];
  const d1=sign(C,D,A), d2=sign(C,D,B), d3=sign(A,B,C), d4=sign(A,B,D);
  if (((d1>0&&d2<0)||(d1<0&&d2>0)) && ((d3>0&&d4<0)||(d3<0&&d4>0))) return true;
  return false;
}

export function applyMove(state, row, col) {
  if (state.winner || state.board[`${row},${col}`]) return state;
  if (!canPlace(state.currentPlayer, row, col)) return state;

  const player = state.currentPlayer;
  const opp = player === 'red' ? 'blue' : 'red';
  const board = { ...state.board, [`${row},${col}`]: player };
  const newLinks = [...state.links];

  for (const [dr, dc] of KNIGHT) {
    const nr=row+dr, nc=col+dc;
    if (!inBounds(nr,nc) || board[`${nr},${nc}`] !== player) continue;
    const crosses = newLinks.some(lk =>
      lk.player === opp && segmentsCross(row,col,nr,nc, lk.r1,lk.c1,lk.r2,lk.c2)
    );
    if (!crosses) newLinks.push({ player, r1:row, c1:col, r2:nr, c2:nc });
  }

  const winner = detectWin(board, newLinks, player);
  const next = player === 'red' ? 'blue' : 'red';
  return { ...state, board, links: newLinks, winner, currentPlayer: winner ? player : next, moveCount: state.moveCount + 1 };
}

function detectWin(board, links, player) {
  const adj = {};
  for (const lk of links) {
    if (lk.player !== player) continue;
    const k1=`${lk.r1},${lk.c1}`, k2=`${lk.r2},${lk.c2}`;
    (adj[k1]=adj[k1]||[]).push(k2);
    (adj[k2]=adj[k2]||[]).push(k1);
  }
  const isStart = k => { const [r,c]=k.split(',').map(Number); return player==='red'?r===0:c===0; };
  const isEnd   = k => { const [r,c]=k.split(',').map(Number); return player==='red'?r===SIZE-1:c===SIZE-1; };
  const starts = Object.keys(board).filter(k => board[k]===player && isStart(k));
  const visited = new Set(starts);
  const queue = [...starts];
  while (queue.length) {
    const k = queue.shift();
    if (isEnd(k)) return player;
    for (const nk of (adj[k]||[])) {
      if (!visited.has(nk)) { visited.add(nk); queue.push(nk); }
    }
  }
  return null;
}

export function evaluate(state, player) {
  if (state.winner === player) return 100000;
  if (state.winner) return -100000;
  let score = 0;
  for (const [k, p] of Object.entries(state.board)) {
    const [r,c] = k.split(',').map(Number);
    const centrality = SIZE/2 - Math.max(Math.abs(r-SIZE/2), Math.abs(c-SIZE/2));
    if (p === player) score += centrality * 2;
    else score -= centrality;
  }
  for (const lk of state.links) {
    if (lk.player === player) score += 5; else score -= 4;
  }
  return score;
}

// Remove a player's own peg (and all links touching it). Does not advance the turn.
export function removePeg(state, r, c) {
  const k = `${r},${c}`;
  if (state.board[k] !== state.currentPlayer) return state;
  const board = { ...state.board };
  delete board[k];
  const links = state.links.filter(lk => !(lk.r1===r&&lk.c1===c) && !(lk.r2===r&&lk.c2===c));
  return { ...state, board, links };
}

// Remove a specific link (must belong to current player). Does not advance the turn.
export function removeLink(state, r1, c1, r2, c2) {
  const links = state.links.filter(lk =>
    !(lk.player===state.currentPlayer && lk.r1===r1 && lk.c1===c1 && lk.r2===r2 && lk.c2===c2) &&
    !(lk.player===state.currentPlayer && lk.r1===r2 && lk.c1===c2 && lk.r2===r1 && lk.c2===c1)
  );
  return { ...state, links };
}

export function getEmptyCells(board, player) {
  const cells = [];
  for (let r = 0; r < SIZE; r++)
    for (let c = 0; c < SIZE; c++)
      if (!board[`${r},${c}`] && canPlace(player, r, c)) cells.push([r,c]);
  return cells;
}

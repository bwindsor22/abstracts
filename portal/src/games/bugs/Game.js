// Game.js — Hive core logic (pure, no React)
// No fixed board — tiles placed around each other on a hex grid.
// Surround the opponent's Queen Bee to win.
// Pieces: Queen(1), Beetle(2), Grasshopper(3), Spider(2), Ant(3) per player

export const PIECE_COUNTS = { queen: 1, beetle: 2, grasshopper: 3, spider: 2, ant: 3 };
export const PIECE_LIST = Object.keys(PIECE_COUNTS);
export const DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,-1],[-1,1]];

export const key = (q, r) => `${q},${r}`;
export const parseKey = k => k.split(',').map(Number);

export function makePieceId(player, type, n) { return `${player}_${type}_${n}`; }

export function initState({ vsAI = false, aiPlayer = 'white', difficulty = 'medium' } = {}) {
  const hand = {};
  for (const p of ['black', 'white']) {
    hand[p] = {};
    for (const [type, count] of Object.entries(PIECE_COUNTS))
      for (let n = 0; n < count; n++)
        hand[p][makePieceId(p, type, n)] = type;
  }
  return {
    board: {},   // 'q,r' → [{pieceId, player, type}]  (stack for beetle)
    hand,
    currentPlayer: 'black',
    moveNumber: 0,
    winner: null,
    queenPlaced: { black: false, white: false },
    vsAI, aiPlayer, difficulty,
  };
}

export const topPiece = (board, q, r) => { const s=board[key(q,r)]; return s?.length ? s[s.length-1] : null; };
export const occupied  = (board, q, r) => !!topPiece(board, q, r);
export const neighbours = (q, r) => DIRS.map(([dq,dr]) => [q+dq, r+dr]);

function isConnected(board, skipKey) {
  const all = Object.keys(board).filter(k => k!==skipKey && board[k]?.length>0);
  if (all.length <= 1) return true;
  const visited = new Set([all[0]]);
  const q2 = [all[0]];
  while (q2.length) {
    const [cq,cr] = parseKey(q2.shift());
    for (const [nq,nr] of neighbours(cq,cr)) {
      const nk = key(nq,nr);
      if (!visited.has(nk) && all.includes(nk)) { visited.add(nk); q2.push(nk); }
    }
  }
  return visited.size === all.length;
}

function canSlide(board, q, r, nq, nr) {
  // Two shared neighbours must not both be occupied (gate check)
  const shared = neighbours(q,r).filter(([sq,sr]) =>
    neighbours(nq,nr).some(([tq,tr]) => tq===sq && tr===sr)
  );
  return shared.filter(([sq,sr]) => occupied(board,sq,sr)).length < 2;
}

export function getPlacementCells(state, player) {
  const opp = player==='black'?'white':'black';
  const all = Object.keys(state.board).filter(k => state.board[k]?.length>0);
  if (all.length===0) return [[0,0]];
  if (all.length===1) {
    const [fq,fr]=parseKey(all[0]);
    return neighbours(fq,fr).filter(([q,r])=>!occupied(state.board,q,r));
  }
  const cands = new Set();
  for (const k of all) {
    const top = state.board[k][state.board[k].length - 1];
    if (top.player !== player) continue;
    const [q,r]=parseKey(k);
    for (const [nq,nr] of neighbours(q,r))
      if (!occupied(state.board,nq,nr)) cands.add(key(nq,nr));
  }
  return [...cands].map(parseKey).filter(([q,r]) =>
    !neighbours(q,r).some(([nq,nr]) => { const t=topPiece(state.board,nq,nr); return t&&t.player===opp; })
  );
}

function pieceMoveDests(board, q, r) {
  const piece = topPiece(board,q,r);
  if (!piece) return [];
  const type = piece.type;
  if (type==='queen') {
    return neighbours(q,r).filter(([nq,nr])=>!occupied(board,nq,nr)&&canSlide(board,q,r,nq,nr));
  }
  if (type==='beetle') {
    return neighbours(q,r).filter(([nq,nr])=>{
      if (occupied(board,nq,nr)) return true;
      return canSlide(board,q,r,nq,nr);
    });
  }
  if (type==='grasshopper') {
    const moves=[];
    for (const [dq,dr] of DIRS) {
      let cq=q+dq,cr=r+dr;
      if (!occupied(board,cq,cr)) continue;
      while (occupied(board,cq,cr)){cq+=dq;cr+=dr;}
      moves.push([cq,cr]);
    }
    return moves;
  }
  if (type==='ant') {
    const tmp={...board}; delete tmp[key(q,r)];
    const vis=new Set([key(q,r)]), queue=[[q,r]], res=[];
    while (queue.length) {
      const [cq,cr]=queue.shift();
      for (const [nq,nr] of neighbours(cq,cr)) {
        const nk=key(nq,nr);
        if (vis.has(nk)||occupied(tmp,nq,nr)) continue;
        if (!neighbours(nq,nr).some(([hq,hr])=>occupied(tmp,hq,hr))) continue;
        if (!canSlide(tmp,cq,cr,nq,nr)) continue;
        vis.add(nk); queue.push([nq,nr]); res.push([nq,nr]);
      }
    }
    return res;
  }
  if (type==='spider') {
    const tmp={...board}; delete tmp[key(q,r)];
    const res=new Set();
    function dfs(cq,cr,depth,path) {
      if (depth===3){res.add(key(cq,cr));return;}
      for (const [nq,nr] of neighbours(cq,cr)) {
        const nk=key(nq,nr);
        if (path.has(nk)||occupied(tmp,nq,nr)) continue;
        if (!neighbours(nq,nr).some(([hq,hr])=>occupied(tmp,hq,hr))) continue;
        if (!canSlide(tmp,cq,cr,nq,nr)) continue;
        path.add(nk); dfs(nq,nr,depth+1,path); path.delete(nk);
      }
    }
    dfs(q,r,0,new Set([key(q,r)]));
    return [...res].map(parseKey);
  }
  return [];
}

export function getAllMoves(state, player) {
  const moves = [];
  const mustPlayQueen = state.moveNumber >= 6 && !state.queenPlaced[player];
  const cells = getPlacementCells(state, player);
  for (const [q,r] of cells) {
    for (const [pid, type] of Object.entries(state.hand[player])) {
      if (mustPlayQueen && type!=='queen') continue;
      moves.push({type:'place', pieceId:pid, pieceType:type, q, r});
    }
  }
  if (state.queenPlaced[player] && !mustPlayQueen) {
    for (const k of Object.keys(state.board)) {
      const stack=state.board[k];
      if (!stack?.length || stack[stack.length-1].player!==player) continue;
      if (!isConnected(state.board, k)) continue;
      const [q,r]=parseKey(k);
      for (const [nq,nr] of pieceMoveDests(state.board, q, r))
        moves.push({type:'move', fromKey:k, q:nq, r:nr});
    }
  }
  return moves;
}

// Validate a move against the current state before applying it
export function isValidMove(state, move) {
  const validMoves = getAllMoves(state, state.currentPlayer);
  if (move.type === 'place') {
    return validMoves.some(m => m.type === 'place' && m.pieceId === move.pieceId && m.q === move.q && m.r === move.r);
  }
  if (move.type === 'move') {
    return validMoves.some(m => m.type === 'move' && m.fromKey === move.fromKey && m.q === move.q && m.r === move.r);
  }
  return false;
}

export function applyMove(state, move) {
  const player = state.currentPlayer;

  // Safety check: reject invalid moves to prevent hive disconnection bugs
  if (!isValidMove(state, move)) {
    console.warn('[Hive] Rejected invalid move:', move, 'for player', player);
    return state; // Return unchanged state
  }

  const board={};
  for (const [k,v] of Object.entries(state.board)) board[k]=[...v];
  const hand={black:{...state.hand.black}, white:{...state.hand.white}};

  const isQueenMove = move.type==='place' && hand[player][move.pieceId]==='queen';

  if (move.type==='place') {
    const k=key(move.q,move.r);
    board[k]=[...(board[k]||[]), {pieceId:move.pieceId, player, type:hand[player][move.pieceId]}];
    delete hand[player][move.pieceId];
  } else {
    const piece=board[move.fromKey].pop();
    if (!board[move.fromKey].length) delete board[move.fromKey];
    const k=key(move.q,move.r);
    board[k]=[...(board[k]||[]), piece];
  }

  const queenPlaced={
    ...state.queenPlaced,
    [player]: state.queenPlaced[player] || isQueenMove,
  };

  const surrounded = p => {
    for (const [k,stack] of Object.entries(board)) {
      if (!stack?.length) continue;
      const base=stack[0];
      if (base.player===p && base.type==='queen') {
        const [q,r]=parseKey(k);
        return neighbours(q,r).every(([nq,nr])=>occupied(board,nq,nr));
      }
    }
    return false;
  };

  // Post-move connectivity assertion (pass undefined so no key is skipped)
  if (!isConnected(board, undefined)) {
    console.error('[Hive] Board disconnected after move!', move);
  }

  const opp = player==='black'?'white':'black';
  const oppSurrounded = surrounded(opp);
  const selfSurrounded = surrounded(player);
  // If both queens are surrounded simultaneously, it's a draw
  const winner = (oppSurrounded && selfSurrounded) ? 'draw' : oppSurrounded ? player : selfSurrounded ? opp : null;
  const next = player==='black'?'white':'black';
  return {...state, board, hand, queenPlaced, winner, currentPlayer: winner?player:next, moveNumber:state.moveNumber+1};
}

export function evaluate(state, player) {
  if (state.winner===player) return 100000;
  if (state.winner==='draw') return 0;
  if (state.winner) return -100000;
  const opp=player==='black'?'white':'black';
  let score=0;
  for (const [k,stack] of Object.entries(state.board)) {
    if (!stack?.length) continue;
    const base=stack[0];
    if (base.type!=='queen') continue;
    const [q,r]=parseKey(k);
    const surr=neighbours(q,r).filter(([nq,nr])=>occupied(state.board,nq,nr)).length;
    if (base.player===opp) score+=surr*20;
    else score-=surr*25;
  }
  return score;
}

// Game.js — Santorini core logic (pure, no React)
// 5×5 grid. Two players, each with 2 workers.
// Turn: select worker → move (adjacent, max +1 level) → build (adjacent, no dome).
// Win: move a worker onto a level-3 tower. Lose: no valid moves on your turn.

export const SIZE = 5;

// Adjacency: 8 directions
const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

function inBounds(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

// Board cell: { level: 0-3, dome: bool, worker: null | 'p1a'|'p1b'|'p2a'|'p2b' }
function emptyCell() {
  return { level: 0, dome: false, worker: null };
}

export function initState({ vsAI = false, aiPlayer = 'p2', difficulty = 'medium' } = {}) {
  return {
    board: Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, emptyCell)
    ),
    // Worker positions: p1a, p1b, p2a, p2b
    workers: { p1a: null, p1b: null, p2a: null, p2b: null },
    currentPlayer: 'p1',
    phase: 'setup',        // 'setup' | 'select' | 'move' | 'build'
    setupStep: 0,          // 0=p1a, 1=p1b, 2=p2a, 3=p2b
    selectedWorker: null,  // 'p1a' | 'p1b' | 'p2a' | 'p2b'
    movedTo: null,         // { r, c } after move, for build phase
    winner: null,
    winReason: null,
    moveCount: 0,
    vsAI, aiPlayer, difficulty,
  };
}

// ── Setup phase ────────────────────────────────────────────────────────────────

const SETUP_ORDER = ['p1a', 'p1b', 'p2a', 'p2b'];
const SETUP_PLAYER = ['p1', 'p1', 'p2', 'p2'];

export function applySetup(state, r, c) {
  if (state.phase !== 'setup') return state;
  const cell = state.board[r][c];
  if (cell.worker) return state; // occupied

  const workerKey = SETUP_ORDER[state.setupStep];
  const board = state.board.map(row => row.map(cell => ({ ...cell })));
  board[r][c] = { ...board[r][c], worker: workerKey };

  const workers = { ...state.workers, [workerKey]: { r, c } };
  const nextStep = state.setupStep + 1;
  const phase = nextStep >= 4 ? 'select' : 'setup';
  const currentPlayer = phase === 'select' ? 'p1' : SETUP_PLAYER[nextStep];

  return { ...state, board, workers, setupStep: nextStep, phase, currentPlayer };
}

// ── Move phase ─────────────────────────────────────────────────────────────────

export function getValidMoves(state, workerKey) {
  const pos = state.workers[workerKey];
  if (!pos) return [];
  const { r: fr, c: fc } = pos;
  const fromLevel = state.board[fr][fc].level;
  const moves = [];
  for (const [dr, dc] of DIRS) {
    const tr = fr + dr, tc = fc + dc;
    if (!inBounds(tr, tc)) continue;
    const cell = state.board[tr][tc];
    if (cell.worker) continue;  // occupied
    if (cell.dome) continue;    // dome
    if (cell.level > fromLevel + 1) continue;  // too high
    moves.push({ r: tr, c: tc });
  }
  return moves;
}

export function applyMove(state, r, c) {
  if (state.phase !== 'move') return state;
  const { selectedWorker } = state;
  if (!selectedWorker) return state;

  const validMoves = getValidMoves(state, selectedWorker);
  if (!validMoves.some(m => m.r === r && m.c === c)) return state;

  const pos = state.workers[selectedWorker];
  const board = state.board.map(row => row.map(cell => ({ ...cell })));
  board[pos.r][pos.c] = { ...board[pos.r][pos.c], worker: null };
  board[r][c] = { ...board[r][c], worker: selectedWorker };
  const workers = { ...state.workers, [selectedWorker]: { r, c } };

  // Win check: moved onto level 3
  if (board[r][c].level === 3) {
    return { ...state, board, workers, winner: state.currentPlayer, winReason: 'tower', moveCount: (state.moveCount || 0) + 1 };
  }

  return { ...state, board, workers, phase: 'build', movedTo: { r, c } };
}

// ── Build phase ────────────────────────────────────────────────────────────────

export function getValidBuilds(state) {
  if (state.phase !== 'build' || !state.movedTo) return [];
  const { r: br, c: bc } = state.movedTo;
  const builds = [];
  for (const [dr, dc] of DIRS) {
    const tr = br + dr, tc = bc + dc;
    if (!inBounds(tr, tc)) continue;
    const cell = state.board[tr][tc];
    if (cell.worker) continue;  // occupied
    if (cell.dome) continue;    // already has dome
    builds.push({ r: tr, c: tc });
  }
  return builds;
}

export function applyBuild(state, r, c) {
  if (state.phase !== 'build') return state;

  const validBuilds = getValidBuilds(state);
  if (!validBuilds.some(b => b.r === r && b.c === c)) return state;

  const board = state.board.map(row => row.map(cell => ({ ...cell })));
  const cell = board[r][c];
  if (cell.level < 3) {
    board[r][c] = { ...cell, level: cell.level + 1 };
  } else {
    board[r][c] = { ...cell, dome: true };
  }

  const nextPlayer = state.currentPlayer === 'p1' ? 'p2' : 'p1';

  // Check if next player can complete a full Move + Build with at least one worker.
  // Per rules, a player loses if they cannot legally complete BOTH actions.
  const nextWorkers = nextPlayer === 'p1' ? ['p1a', 'p1b'] : ['p2a', 'p2b'];
  const nextState = { ...state, board, phase: 'select', currentPlayer: nextPlayer,
    selectedWorker: null, movedTo: null, moveCount: (state.moveCount || 0) + 1 };
  const canCompleteTurn = nextWorkers.some(w => {
    const s1 = applySelect(nextState, w);
    if (s1.phase !== 'move') return false;
    return getValidMoves(s1, w).some(mv => {
      const s2 = applyMove(s1, mv.r, mv.c);
      if (s2.winner) return true; // winning move counts — no build needed
      return getValidBuilds(s2).length > 0;
    });
  });
  if (!canCompleteTurn) {
    // Current player wins (opponent cannot complete any turn)
    return { ...nextState, winner: state.currentPlayer, winReason: 'stuck' };
  }

  return nextState;
}

// ── Select phase ───────────────────────────────────────────────────────────────

export function applySelect(state, workerKey) {
  if (state.phase !== 'select') return state;
  const owner = workerKey.startsWith('p1') ? 'p1' : 'p2';
  if (owner !== state.currentPlayer) return state;
  const moves = getValidMoves(state, workerKey);
  if (moves.length === 0) return state; // this worker is stuck, pick other
  return { ...state, phase: 'move', selectedWorker: workerKey };
}

export function cancelSelect(state) {
  if (state.phase !== 'move') return state;
  return { ...state, phase: 'select', selectedWorker: null };
}

// ── AI helpers ─────────────────────────────────────────────────────────────────

export function getWorkerKeys(player) {
  return player === 'p1' ? ['p1a', 'p1b'] : ['p2a', 'p2b'];
}

export function getAllMoves(state) {
  // Returns all (workerKey, moveR, moveC, buildR, buildC) for the current player.
  const moves = [];
  for (const wk of getWorkerKeys(state.currentPlayer)) {
    const s1 = applySelect(state, wk);
    if (s1.phase !== 'move') continue;
    for (const mv of getValidMoves(s1, wk)) {
      const s2 = applyMove(s1, mv.r, mv.c);
      if (s2.winner) {
        moves.push({ wk, mr: mv.r, mc: mv.c, br: -1, bc: -1, immediate: true });
        continue;
      }
      for (const bv of getValidBuilds(s2)) {
        moves.push({ wk, mr: mv.r, mc: mv.c, br: bv.r, bc: bv.c, immediate: false });
      }
    }
  }
  return moves;
}

export function applyFullMove(state, { wk, mr, mc, br, bc }) {
  let s = applySelect(state, wk);
  s = applyMove(s, mr, mc);
  if (s.winner) return s;
  return applyBuild(s, br, bc);
}

export function evaluate(state, player) {
  if (state.winner === player) return 100000;
  if (state.winner && state.winner !== player) return -100000;

  const opp = player === 'p1' ? 'p2' : 'p1';
  let score = 0;

  // Reward high positions for my workers, penalize high positions for opponent
  for (const wk of getWorkerKeys(player)) {
    const pos = state.workers[wk];
    if (pos) score += state.board[pos.r][pos.c].level * 3;
  }
  for (const wk of getWorkerKeys(opp)) {
    const pos = state.workers[wk];
    if (pos) score -= state.board[pos.r][pos.c].level * 3;
  }

  // Mobility: number of moves available
  const myMoves = getWorkerKeys(player).reduce((acc, wk) => acc + getValidMoves(state, wk).length, 0);
  const oppMoves = getWorkerKeys(opp).reduce((acc, wk) => acc + getValidMoves(state, wk).length, 0);
  score += myMoves - oppMoves;

  return score;
}

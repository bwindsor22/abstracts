// Game.js — YINSH core logic (pure, no React)

// ─── Board Geometry ──────────────────────────────────────────────────────────
export const CELL_SIZE = 54;
export const BOARD_SVG_SIZE = 600;

// 85 valid cells: radius-5 axial hexagon minus 6 corner cells (91 - 6 = 85)
const CORNER_SET = new Set(['5,0', '-5,0', '0,5', '0,-5', '5,-5', '-5,5']);

export function isValidCell(q, r) {
  const d = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
  return d <= 5 && !CORNER_SET.has(`${q},${r}`);
}

export const VALID_CELL_KEYS = [];
for (let q = -5; q <= 5; q++) {
  for (let r = -5; r <= 5; r++) {
    if (isValidCell(q, r)) VALID_CELL_KEYS.push(`${q},${r}`);
  }
}
export const VALID_CELL_SET = new Set(VALID_CELL_KEYS);

// 6 axial movement directions [dq, dr]
export const DIRECTIONS = [
  [1, 0], [-1, 0],
  [0, 1], [0, -1],
  [1, -1], [-1, 1],
];

export function cellToPixel(q, r) {
  const cx = BOARD_SVG_SIZE / 2;
  const cy = BOARD_SVG_SIZE / 2;
  return {
    x: cx + CELL_SIZE * (q + r * 0.5),
    y: cy + CELL_SIZE * (r * Math.sqrt(3) / 2),
  };
}

export function coordKey(q, r) { return `${q},${r}`; }

export function parseKey(key) {
  const parts = key.split(',');
  return [Number(parts[0]), Number(parts[1])];
}

// ─── State Initialisation ────────────────────────────────────────────────────
export function initState({ vsAI = false, aiPlayer = 'black', difficulty = 'medium', blitz = false } = {}) {
  return {
    phase: 'setup',           // 'setup' | 'play' | 'resolveRows' | 'end'
    currentPlayer: 'white',   // white places first
    board: {},                // { 'q,r': { type:'ring'|'marker', owner?:'white'|'black', colorUp?:'white'|'black' } }
    ringsOnBoard: { white: [], black: [] },
    ringsScored: { white: 0, black: 0 },
    markersPool: 51,
    setupDone: { white: 0, black: 0 },
    selectedRing: null,       // coord key of selected ring during play
    pendingRows: [],          // [{ player, cells:[key,...] }]
    resolvingPlayer: null,
    resolveStep: 'selectRow', // 'selectRow' | 'selectRing'
    winner: null,
    moveCount: 0,
    vsAI, aiPlayer, difficulty, blitz,
  };
}

// ─── Setup ───────────────────────────────────────────────────────────────────
export function placeRingSetup(state, key) {
  if (state.phase !== 'setup' || state.board[key]) return state;

  const board = { ...state.board, [key]: { type: 'ring', owner: state.currentPlayer } };
  const ringsOnBoard = {
    ...state.ringsOnBoard,
    [state.currentPlayer]: [...state.ringsOnBoard[state.currentPlayer], key],
  };
  const setupDone = { ...state.setupDone, [state.currentPlayer]: state.setupDone[state.currentPlayer] + 1 };
  const opponent = state.currentPlayer === 'white' ? 'black' : 'white';

  if (setupDone.white >= 5 && setupDone.black >= 5) {
    return { ...state, board, ringsOnBoard, setupDone, phase: 'play', currentPlayer: 'white' };
  }
  return { ...state, board, ringsOnBoard, setupDone, currentPlayer: opponent };
}

// ─── Valid Move Calculation ───────────────────────────────────────────────────
export function getValidMoves(state, ringKey) {
  const [q, r] = parseKey(ringKey);
  const destinations = [];

  for (const [dq, dr] of DIRECTIONS) {
    let cq = q + dq;
    let cr = r + dr;
    let jumped = false;

    while (isValidCell(cq, cr)) {
      const key = coordKey(cq, cr);
      const cell = state.board[key];

      if (cell?.type === 'ring') break;

      if (!cell) {
        destinations.push(key);
        if (jumped) break; // must stop at first empty after markers
      } else if (cell.type === 'marker') {
        jumped = true;
      }

      cq += dq;
      cr += dr;
    }
  }
  return destinations;
}

// ─── Move Execution ───────────────────────────────────────────────────────────
function dirBetween(fromKey, toKey) {
  const [fq, fr] = parseKey(fromKey);
  const [tq, tr] = parseKey(toKey);
  const dq = tq - fq;
  const dr = tr - fr;
  const steps = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(dq + dr));
  return [dq / steps, dr / steps];
}

function jumpedMarkers(board, fromKey, toKey) {
  const [fq, fr] = parseKey(fromKey);
  const [dq, dr] = dirBetween(fromKey, toKey);
  const result = [];
  let cq = fq + dq;
  let cr = fr + dr;
  while (coordKey(cq, cr) !== toKey) {
    const k = coordKey(cq, cr);
    if (board[k]?.type === 'marker') result.push(k);
    cq += dq;
    cr += dr;
  }
  return result;
}

export function applyMove(state, fromKey, toKey) {
  const board = { ...state.board };
  const ringsOnBoard = { white: [...state.ringsOnBoard.white], black: [...state.ringsOnBoard.black] };
  const owner = board[fromKey].owner;

  board[fromKey] = { type: 'marker', colorUp: owner };
  for (const k of jumpedMarkers(board, fromKey, toKey)) {
    board[k] = { ...board[k], colorUp: board[k].colorUp === 'white' ? 'black' : 'white' };
  }
  board[toKey] = { type: 'ring', owner };
  ringsOnBoard[owner] = ringsOnBoard[owner].filter(k => k !== fromKey);
  ringsOnBoard[owner].push(toKey);

  return resolveAfterMove({ ...state, board, ringsOnBoard, markersPool: state.markersPool - 1, selectedRing: null, moveCount: (state.moveCount || 0) + 1 });
}

// ─── Row Detection ────────────────────────────────────────────────────────────
const SCAN_DIRS = [[1, 0], [0, 1], [1, -1]];

export function detectRows(board) {
  const rows = { white: [], black: [] };
  const seen = new Set();

  for (const [dq, dr] of SCAN_DIRS) {
    for (const key of Object.keys(board)) {
      const cell = board[key];
      if (!cell || cell.type !== 'marker') continue;
      const dk = `${key}|${dq},${dr}`;
      if (seen.has(dk)) continue;

      const color = cell.colorUp;
      const [sq, sr] = parseKey(key);

      // Walk backward to run start
      let [q, r] = [sq, sr];
      while (true) {
        const [bq, br] = [q - dq, r - dr];
        const pk = coordKey(bq, br);
        if (isValidCell(bq, br) && board[pk]?.type === 'marker' && board[pk]?.colorUp === color) {
          [q, r] = [bq, br];
        } else break;
      }

      // Walk forward collecting run
      const run = [];
      let [cq, cr] = [q, r];
      while (isValidCell(cq, cr)) {
        const k = coordKey(cq, cr);
        if (board[k]?.type !== 'marker' || board[k]?.colorUp !== color) break;
        run.push(k);
        seen.add(`${k}|${dq},${dr}`);
        cq += dq;
        cr += dr;
      }

      if (run.length >= 5) {
        for (let i = 0; i <= run.length - 5; i++) {
          rows[color].push(run.slice(i, i + 5));
        }
      }
    }
  }
  return rows;
}

function resolveAfterMove(state) {
  const rows = detectRows(state.board);
  const opponent = state.currentPlayer === 'white' ? 'black' : 'white';
  const myRows = rows[state.currentPlayer];
  const oppRows = rows[opponent];

  if (myRows.length === 0 && oppRows.length === 0) {
    if (state.markersPool <= 0) {
      const w = state.ringsScored.white;
      const b = state.ringsScored.black;
      return { ...state, phase: 'end', winner: w > b ? 'white' : b > w ? 'black' : null };
    }
    return { ...state, phase: 'play', currentPlayer: opponent };
  }

  const pendingRows = [
    ...myRows.map(cells => ({ player: state.currentPlayer, cells })),
    ...oppRows.map(cells => ({ player: opponent, cells })),
  ];

  // Moving player resolves first; if they have no rows, opponent resolves
  const firstResolver = myRows.length > 0 ? state.currentPlayer : opponent;
  return { ...state, phase: 'resolveRows', resolvingPlayer: firstResolver, pendingRows, resolveStep: 'selectRow' };
}

// ─── Row Resolution ───────────────────────────────────────────────────────────
export function removeRow(state, rowIndex) {
  const row = state.pendingRows[rowIndex];
  if (!row || row.player !== state.resolvingPlayer) return state;

  const board = { ...state.board };
  for (const k of row.cells) delete board[k];
  const pendingRows = state.pendingRows.filter((_, i) => i !== rowIndex);

  return { ...state, board, markersPool: state.markersPool + row.cells.length, pendingRows, resolveStep: 'selectRing' };
}

export function scoreRing(state, ringKey) {
  if (state.resolveStep !== 'selectRing') return state;
  const player = state.resolvingPlayer;
  if (state.board[ringKey]?.owner !== player || state.board[ringKey]?.type !== 'ring') return state;

  const board = { ...state.board };
  delete board[ringKey];
  const ringsOnBoard = { ...state.ringsOnBoard, [player]: state.ringsOnBoard[player].filter(k => k !== ringKey) };
  const ringsScored = { ...state.ringsScored, [player]: state.ringsScored[player] + 1 };
  const winsNeeded = state.blitz ? 1 : 3;

  if (ringsScored[player] >= winsNeeded) {
    return { ...state, board, ringsOnBoard, ringsScored, phase: 'end', winner: player };
  }

  const opponent = player === 'white' ? 'black' : 'white';
  const myRemaining = state.pendingRows.filter(r => r.player === player);
  if (myRemaining.length > 0) {
    return { ...state, board, ringsOnBoard, ringsScored, resolveStep: 'selectRow' };
  }
  const oppRemaining = state.pendingRows.filter(r => r.player === opponent);
  if (oppRemaining.length > 0) {
    return { ...state, board, ringsOnBoard, ringsScored, resolvingPlayer: opponent, resolveStep: 'selectRow' };
  }

  return {
    ...state, board, ringsOnBoard, ringsScored,
    phase: 'play', currentPlayer: opponent, resolvingPlayer: null, pendingRows: [], selectedRing: null,
  };
}

export function getAllLegalMoves(state, player) {
  if (state.phase === 'setup') {
    return VALID_CELL_KEYS.filter(k => !state.board[k]).map(k => ({ type: 'placeRing', to: k }));
  }
  const moves = [];
  for (const ringKey of state.ringsOnBoard[player]) {
    for (const dest of getValidMoves(state, ringKey)) {
      moves.push({ type: 'moveRing', from: ringKey, to: dest });
    }
  }
  return moves;
}

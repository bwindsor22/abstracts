import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';

// ── Board topology ─────────────────────────────────────────────────────────────
// 24 positions on 3 concentric squares, numbered 0-23:
//  0---1---2       outer ring
//  |   |   |
//  3-4-5   6-7-8   (4=middle ring top-left, etc.)
//  |       |
//  9  10  11       (middle ring sides + inner ring)
//     ...
// Using labeled positions for clarity:
// Outer: a1 a2 a3 b1 b3 c1 c2 c3
// Middle: d1 d2 d3 e1 e3 f1 f2 f3
// Inner: g1 g2 g3 h1 h3 i1 i2 i3
//
// We use indices 0-23 mapped to a grid:

const POSITIONS = [
  // outer ring (0-7)
  [0,0],[3,0],[6,0], // top row
  [0,3],[6,3],       // middle row
  [0,6],[3,6],[6,6], // bottom row
  // middle ring (8-15)
  [1,1],[3,1],[5,1], // top row
  [1,3],[5,3],       // middle row
  [1,5],[3,5],[5,5], // bottom row
  // inner ring (16-23)
  [2,2],[3,2],[4,2], // top row
  [2,3],[4,3],       // middle row
  [2,4],[3,4],[4,4], // bottom row
];

const ADJACENCY = [
  [1,3],       // 0
  [0,2,9],     // 1
  [1,4],       // 2
  [0,5,11],    // 3
  [2,7,12],    // 4
  [3,6],       // 5
  [5,7,14],    // 6
  [4,6],       // 7 (was pointing to 8 wrong — fix)
  [9,11],      // 8
  [1,8,10,17], // 9 (corrected)
  [9,12],      // 10
  [3,8,13,19], // 11
  [4,10,15,20],// 12
  [11,14],     // 13
  [6,13,15,22],// 14
  [12,14],     // 15 (was wrong)
  [17,19],     // 16
  [9,16,18],   // 17
  [17,20],     // 18
  [11,16,21],  // 19
  [12,18,23],  // 20
  [19,22],     // 21
  [14,21,23],  // 22
  [20,22],     // 23
];

const MILLS = [
  // Outer
  [0,1,2],[5,6,7],[0,3,5],[2,4,7],[0,1,2],[5,6,7],
  // Middle
  [8,9,10],[13,14,15],[8,11,13],[10,12,15],
  // Inner
  [16,17,18],[21,22,23],[16,19,21],[18,20,23],
  // Cross lines
  [1,9,17],[6,14,22],[3,11,19],[4,12,20],
];
// Deduplicate
const MILL_SET = [];
{
  const seen = new Set();
  for (const m of MILLS) {
    const k = m.slice().sort().join(',');
    if (!seen.has(k)) { seen.add(k); MILL_SET.push(m); }
  }
}

function checkMill(board, pos, player) {
  return MILL_SET.some(m => m.includes(pos) && m.every(i => board[i] === player));
}

function allInMills(board, player) {
  const pieces = board.map((v,i) => v === player ? i : -1).filter(i => i >= 0);
  return pieces.every(p => checkMill(board, p, player));
}

// ── Game state ─────────────────────────────────────────────────────────────────
function initState({ vsAI = true, difficulty = 'medium' } = {}) {
  return {
    board: Array(24).fill(null),
    phase: 'place', // place | move | fly | remove
    currentPlayer: 0,
    piecesInHand: [9, 9],
    capturedCount: [0, 0],
    winner: null,
    vsAI,
    aiPlayer: 1,
    difficulty,
    moveCount: 0,
    pendingRemove: false,
  };
}

function getPhase(state, player) {
  if (state.piecesInHand[player] > 0) return 'place';
  const count = state.board.filter(v => v === player).length;
  if (count === 3) return 'fly';
  return 'move';
}

function getValidMoves(state, player) {
  const phase = getPhase(state, player);
  const moves = [];
  if (phase === 'place') {
    for (let i = 0; i < 24; i++) {
      if (state.board[i] === null) moves.push({ type: 'place', to: i });
    }
  } else if (phase === 'move') {
    for (let i = 0; i < 24; i++) {
      if (state.board[i] !== player) continue;
      for (const adj of ADJACENCY[i]) {
        if (state.board[adj] === null) moves.push({ type: 'move', from: i, to: adj });
      }
    }
  } else { // fly
    for (let i = 0; i < 24; i++) {
      if (state.board[i] !== player) continue;
      for (let j = 0; j < 24; j++) {
        if (state.board[j] === null) moves.push({ type: 'fly', from: i, to: j });
      }
    }
  }
  return moves;
}

function getRemovable(state, opponent) {
  const pieces = state.board.map((v,i) => v === opponent ? i : -1).filter(i => i >= 0);
  const notInMill = pieces.filter(p => !checkMill(state.board, p, opponent));
  return notInMill.length > 0 ? notInMill : pieces; // if all in mills, can remove any
}

function applyMove(state, move) {
  const s = { ...state, board: state.board.slice(), piecesInHand: state.piecesInHand.slice(), capturedCount: state.capturedCount.slice() };
  const player = s.currentPlayer;

  if (move.type === 'remove') {
    s.board[move.pos] = null;
    s.capturedCount[player]++;
    s.pendingRemove = false;
    s.currentPlayer = 1 - player;
    s.moveCount++;
  } else {
    if (move.from !== undefined) s.board[move.from] = null;
    s.board[move.to] = player;
    if (move.type === 'place') s.piecesInHand[player]--;

    if (checkMill(s.board, move.to, player)) {
      s.pendingRemove = true;
      return s; // don't switch player yet
    }
    s.currentPlayer = 1 - player;
    s.moveCount++;
  }

  // Check winner
  const opp = 1 - s.currentPlayer;
  const oppOnBoard = s.board.filter(v => v === s.currentPlayer).length;
  const oppInHand = s.piecesInHand[s.currentPlayer];
  if (oppOnBoard + oppInHand < 3 && oppInHand === 0) {
    s.winner = 1 - s.currentPlayer;
  } else if (getValidMoves(s, s.currentPlayer).length === 0 && !s.pendingRemove && s.piecesInHand[s.currentPlayer] === 0) {
    s.winner = 1 - s.currentPlayer;
  }

  return s;
}

// ── AI ─────────────────────────────────────────────────────────────────────────
function evaluate(state) {
  const p = state.aiPlayer;
  const o = 1 - p;
  const myPieces = state.board.filter(v => v === p).length + state.piecesInHand[p];
  const oppPieces = state.board.filter(v => v === o).length + state.piecesInHand[o];
  if (state.winner === p) return 1000;
  if (state.winner === o) return -1000;
  return (myPieces - oppPieces) * 10 + state.capturedCount[p] * 5 - state.capturedCount[o] * 5;
}

function aiMinimax(state, depth, alpha, beta, maximizing) {
  if (state.winner !== null || depth === 0) return { score: evaluate(state), move: null };

  const player = state.currentPlayer;

  if (state.pendingRemove) {
    const removable = getRemovable(state, 1 - player);
    let best = { score: maximizing ? -Infinity : Infinity, move: null };
    for (const pos of removable) {
      const move = { type: 'remove', pos };
      const next = applyMove(state, move);
      const result = aiMinimax(next, depth - 1, alpha, beta, !maximizing);
      if (maximizing ? result.score > best.score : result.score < best.score) {
        best = { score: result.score, move };
      }
      if (maximizing) alpha = Math.max(alpha, best.score);
      else beta = Math.min(beta, best.score);
      if (beta <= alpha) break;
    }
    return best;
  }

  const moves = getValidMoves(state, player);
  if (moves.length === 0) return { score: evaluate(state), move: null };

  let best = { score: maximizing ? -Infinity : Infinity, move: moves[0] };
  for (const m of moves) {
    const next = applyMove(state, m);
    const nextMax = next.pendingRemove ? maximizing : !maximizing;
    const result = aiMinimax(next, depth - 1, alpha, beta, nextMax);
    if (maximizing ? result.score > best.score : result.score < best.score) {
      best = { score: result.score, move: m };
    }
    if (maximizing) alpha = Math.max(alpha, best.score);
    else beta = Math.min(beta, best.score);
    if (beta <= alpha) break;
  }
  return best;
}

function getAIAction(state, difficulty) {
  const depths = { easy: 2, medium: 4, hard: 6 };
  const depth = depths[difficulty] || 4;
  const { move } = aiMinimax(state, depth, -Infinity, Infinity, true);
  return move;
}

// ── Start screen ───────────────────────────────────────────────────────────────
function StartScreen({ onStart, onBack }) {
  const [difficulty, setDifficulty] = useState('medium');
  return (
    <div className="mills-start">
      <h1>MILLS</h1>
      <p className="start-desc">Reduce your opponent to 2 pieces or block all moves</p>
      <p className="start-rule">
        Place 9 pieces, then slide along lines.<br />
        Form a row of 3 (a mill) to remove an opponent's piece.<br />
        With 3 pieces left, you can fly to any empty spot.
      </p>
      <div className="difficulty-row">
        <label>Difficulty:</label>
        {['easy', 'medium', 'hard'].map(d => (
          <button key={d} onClick={() => setDifficulty(d)}
            className={`diff-btn${difficulty === d ? ' active' : ''}`}>
            {d}
          </button>
        ))}
      </div>
      <button onClick={() => onStart({ vsAI: true, difficulty })} className="btn-primary">
        Start Game
      </button>
      {onBack && (
        <div style={{ marginTop: 16 }}>
          <button onClick={onBack} className="diff-btn">← Home</button>
        </div>
      )}
    </div>
  );
}

// ── SVG Board ──────────────────────────────────────────────────────────────────
const SVG_SIZE = 380;
const MARGIN = 30;
const SCALE = (SVG_SIZE - 2 * MARGIN) / 6;
function toSVG(gx, gy) {
  return { x: MARGIN + gx * SCALE, y: MARGIN + gy * SCALE };
}

const LINES = [
  // Outer
  [0,1],[1,2],[0,3],[2,4],[3,5],[4,7],[5,6],[6,7],
  // Middle
  [8,9],[9,10],[8,11],[10,12],[11,13],[12,15],[13,14],[14,15],
  // Inner
  [16,17],[17,18],[16,19],[18,20],[19,21],[20,23],[21,22],[22,23],
  // Cross
  [1,9],[9,17],[3,11],[11,19],[6,14],[14,22],[4,12],[12,20],
];

function MillsBoard({ state, selected, onPosClick, validTargets, removable }) {
  const { board, pendingRemove, currentPlayer } = state;
  const removableSet = new Set(removable);
  const validSet = new Set(validTargets);

  return (
    <svg width={SVG_SIZE} height={SVG_SIZE} viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
      style={{ display: 'block', maxWidth: '100%' }}>
      {/* Lines */}
      {LINES.map(([a,b], i) => {
        const p1 = toSVG(...POSITIONS[a]);
        const p2 = toSVG(...POSITIONS[b]);
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke="rgba(153,66,240,0.3)" strokeWidth={2} />;
      })}

      {/* Positions */}
      {POSITIONS.map(([gx,gy], i) => {
        const { x, y } = toSVG(gx, gy);
        const piece = board[i];
        const isSelected = selected === i;
        const isTarget = validSet.has(i);
        const isRemovable = removableSet.has(i);
        const canClick = isTarget || isRemovable || piece === currentPlayer;

        return (
          <g key={i} onClick={() => onPosClick(i)} style={{ cursor: canClick ? 'pointer' : 'default' }}>
            {/* Hit area */}
            <circle cx={x} cy={y} r={16} fill="transparent" />
            {/* Base dot */}
            <circle cx={x} cy={y} r={piece !== null ? 12 : isTarget ? 6 : 5}
              fill={
                piece === 0 ? '#f5f5f5'
                : piece === 1 ? '#555'
                : isTarget ? 'rgba(153,66,240,0.5)'
                : 'rgba(42,31,69,0.8)'
              }
              stroke={
                isSelected ? '#ffe066'
                : isRemovable ? '#ff4444'
                : piece === 0 ? '#ddd'
                : piece === 1 ? '#333'
                : 'rgba(153,66,240,0.25)'
              }
              strokeWidth={isSelected || isRemovable ? 3 : 1.5}
            />
          </g>
        );
      })}
    </svg>
  );
}

// Compact snapshot for replay
function snapshot(s) {
  return { board: s.board.slice(), currentPlayer: s.currentPlayer, piecesInHand: s.piecesInHand.slice(), capturedCount: s.capturedCount.slice() };
}

// ── Main App ───────────────────────────────────────────────────────────────────
export default function App({ onBack, onResult }) {
  const [state, setState] = useState(null);
  const [selected, setSelected] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const resultReported = useRef(false);
  const snapshots = useRef([]);

  const handleStart = useCallback((opts) => {
    const s = initState(opts);
    snapshots.current = [snapshot(s)];
    setState(s);
    setSelected(null);
    resultReported.current = false;
  }, []);

  const phase = state ? getPhase(state, state.currentPlayer) : null;
  const validMoves = state && !state.winner && !state.pendingRemove ? getValidMoves(state, state.currentPlayer) : [];
  const removable = state && state.pendingRemove ? getRemovable(state, 1 - state.currentPlayer) : [];

  let validTargets = [];
  if (phase === 'place') {
    validTargets = validMoves.map(m => m.to);
  } else if (selected !== null) {
    validTargets = validMoves.filter(m => m.from === selected).map(m => m.to);
  }

  const isPlayerTurn = state && !state.winner && state.currentPlayer !== state.aiPlayer;

  const handlePosClick = useCallback((pos) => {
    if (!state || state.winner || !isPlayerTurn) return;

    if (state.pendingRemove) {
      if (removable.includes(pos)) {
        setState(s => { const next = applyMove(s, { type: 'remove', pos }); snapshots.current.push(snapshot(next)); return next; });
        setSelected(null);
      }
      return;
    }

    const p = state.currentPlayer;
    if (phase === 'place') {
      if (state.board[pos] === null) {
        setState(s => { const next = applyMove(s, { type: 'place', to: pos }); snapshots.current.push(snapshot(next)); return next; });
      }
    } else {
      if (state.board[pos] === p) {
        setSelected(pos === selected ? null : pos);
      } else if (selected !== null && state.board[pos] === null) {
        const move = validMoves.find(m => m.from === selected && m.to === pos);
        if (move) {
          setState(s => { const next = applyMove(s, move); snapshots.current.push(snapshot(next)); return next; });
          setSelected(null);
        }
      }
    }
  }, [state, isPlayerTurn, phase, selected, validMoves, removable]);

  // AI turn
  useEffect(() => {
    if (!state || state.winner !== null) return;
    if (state.currentPlayer !== state.aiPlayer && !state.pendingRemove) return;
    if (state.pendingRemove && state.currentPlayer !== state.aiPlayer) return;
    // AI needs to act if it's AI's turn or AI formed a mill (pendingRemove on AI's turn)
    if (state.currentPlayer !== state.aiPlayer) return;

    const timer = setTimeout(() => {
      const move = getAIAction(state, state.difficulty);
      if (!move) return;
      setState(s => { const next = applyMove(s, move); snapshots.current.push(snapshot(next)); return next; });
    }, 400);
    return () => clearTimeout(timer);
  }, [state]);

  // Report result
  useEffect(() => {
    if (!state || state.winner === null || resultReported.current) return;
    resultReported.current = true;
    onResult?.({
      gameId: 'mills',
      gameName: 'Mills',
      won: state.winner === 0,
      moves: state.moveCount,
      difficulty: state.difficulty,
      snapshots: snapshots.current,
    });
  }, [state?.winner, onResult]);

  if (!state) {
    return (
      <div className="game-mills">
        <StartScreen onStart={handleStart} onBack={onBack} />
      </div>
    );
  }

  const { currentPlayer, winner, piecesInHand, capturedCount, pendingRemove } = state;
  const statusMsg = winner !== null
    ? (winner === 0 ? 'YOU WIN!' : 'AI WINS!')
    : pendingRemove ? 'Remove an opponent\'s piece!'
    : currentPlayer === 1 ? 'AI thinking...'
    : phase === 'place' ? `Place a piece (${piecesInHand[0]} left)`
    : 'Select a piece to move';

  return (
    <div className="game-mills">
      <div className="mills-layout">
        <div className="status-bar" style={{ color: winner !== null ? '#ffe066' : pendingRemove ? '#ff8866' : '#f0eeff' }}>
          {statusMsg}
        </div>

        <div className="piece-info">
          <span>You (white): {piecesInHand[0]} in hand, {capturedCount[0]} captured</span>
          <span>AI (black): {piecesInHand[1]} in hand, {capturedCount[1]} captured</span>
        </div>

        <MillsBoard
          state={state}
          selected={selected}
          onPosClick={handlePosClick}
          validTargets={isPlayerTurn ? validTargets : []}
          removable={isPlayerTurn ? removable : []}
        />

        <div className="game-controls">
          <button className="ctrl-btn" onClick={() => setMenuOpen(true)}>MENU</button>
        </div>
      </div>

      {winner !== null && (
        <div className="winner-overlay">
          <div className="winner-banner">
            <div className="winner-label">{winner === 0 ? 'YOU WIN!' : 'AI WINS!'}</div>
            <div className="winner-reason">
              Captured: You {capturedCount[0]} – AI {capturedCount[1]}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button className="ctrl-btn" onClick={() => { setState(initState({ vsAI: true, difficulty: state.difficulty })); setSelected(null); resultReported.current = false; }}>New Game</button>
              {onBack && <button className="ctrl-btn" onClick={onBack}>Home</button>}
            </div>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="menu-panel" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(false)}>Resume</button>
            <button onClick={() => { setState(null); setSelected(null); setMenuOpen(false); }}>New Game</button>
            {onBack && <button onClick={onBack}>Back to Library</button>}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useCallback, useEffect } from 'react';
import './App.css';
import {
  BOARD_SVG_SIZE, VALID_CELL_KEYS, DIRECTIONS,
  isValidCell, cellToPixel, coordKey, parseKey,
  initState, placeRingSetup, getValidMoves, applyMove, removeRow, scoreRing,
} from './Game';
import { getAIMove } from './AI/ai';
import { DndProvider, useDrag, useDrop, useDragLayer } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

const RING_TYPE = 'RING';

function isTouchDevice() {
  return typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
}

// ─── Precompute board lines ───────────────────────────────────────────────────
const LINES = [];
const lineSeen = new Set();
for (const key of VALID_CELL_KEYS) {
  const [q, r] = parseKey(key);
  for (const [dq, dr] of DIRECTIONS) {
    const nq = q + dq, nr = r + dr;
    if (!isValidCell(nq, nr)) continue;
    const lineKey = [key, coordKey(nq, nr)].sort().join('|');
    if (!lineSeen.has(lineKey)) {
      lineSeen.add(lineKey);
      const from = cellToPixel(q, r), to = cellToPixel(nq, nr);
      LINES.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y });
    }
  }
}

// ─── Piece colours ───────────────────────────────────────────────────────────
const RING_STROKE = { white: '#f0ede0', black: '#1a1a1a' };
const RING_FILL   = { white: 'rgba(240,237,224,0.15)', black: 'rgba(26,26,26,0.15)' };
const MARKER_FILL   = { white: '#f0ede0', black: '#1a1a1a' };
const MARKER_STROKE = { white: '#1a1a1a', black: '#f0ede0' };

const DROP_R = 22;  // hit-area radius for each intersection

// ─── BoardCell: drag + drop at each intersection ──────────────────────────────
// Uses foreignObject to embed HTML div (needed for react-dnd to work in SVG).
// item must be plain object (react-dnd v10 requirement).
function BoardCell({ cellKey, x, y, cell, state, onCellClick, onCellDrop, isDraggingActive }) {
  const { phase, currentPlayer, resolvingPlayer, resolveStep, selectedRing } = state;

  const isValidForDrop = (() => {
    if (phase === 'setup') return !cell;
    if (phase === 'play' && selectedRing) return getValidMoves(state, selectedRing).includes(cellKey);
    return false;
  })();

  const isValidForDrag = cell?.type === 'ring' && (
    (phase === 'play' && cell.owner === currentPlayer) ||
    (phase === 'resolveRows' && resolveStep === 'selectRing' && cell.owner === resolvingPlayer)
  );

  // Drop target — accepts rings (from board in play phase)
  const [{ isOver, canDrop }, dropRef] = useDrop({
    accept: RING_TYPE,
    canDrop: (item) => {
      if (item.source === 'board' && phase === 'play') {
        return getValidMoves(state, item.fromKey).includes(cellKey);
      }
      return false;
    },
    drop: (item) => onCellDrop(item, cellKey),
    collect: m => ({ isOver: m.isOver(), canDrop: m.canDrop() }),
  });

  // Drag source — own rings in play or resolveRows/selectRing
  const [{ isDragging }, dragRef] = useDrag({
    item: { type: RING_TYPE, source: 'board', fromKey: cellKey, player: cell?.owner },
    canDrag: () => isValidForDrag,
    collect: m => ({ isDragging: m.isDragging() }),
  });

  // Combine drag+drop on same foreignObject div
  const combineRef = (el) => { dropRef(el); dragRef(el); };

  const showHover = isOver;
  const dropColor = canDrop ? 'rgba(0,200,50,0.55)' : 'rgba(255,50,50,0.45)';
  const dropBorder = canDrop ? 'rgba(0,255,80,0.9)' : 'rgba(255,50,50,0.8)';

  const isSelected = selectedRing === cellKey;
  const isHighlightedRow = phase === 'resolveRows' &&
    state.pendingRows.some(row => row.player === resolvingPlayer && row.cells.includes(cellKey));

  const RING_R = 18;

  const canClick = !cell ? (phase === 'setup' || (phase === 'play' && selectedRing && isValidForDrop)) :
    cell.type === 'ring' ? (
      (phase === 'play' && cell.owner === currentPlayer) ||
      (phase === 'resolveRows' && (
        (resolveStep === 'selectRow' && isHighlightedRow) ||
        (resolveStep === 'selectRing' && cell.owner === resolvingPlayer)
      ))
    ) : (phase === 'resolveRows' && resolveStep === 'selectRow' && isHighlightedRow);

  return (
    <g style={{ cursor: canClick ? 'pointer' : 'default' }} onClick={() => onCellClick(cellKey)}>
      {/* Valid move hint */}
      {isValidForDrop && (
        <circle cx={x} cy={y} r={6} fill="rgba(255,255,100,0.5)" stroke="none" />
      )}
      {/* Highlighted row marker */}
      {isHighlightedRow && (
        <circle cx={x} cy={y} r={14} fill="rgba(255,200,0,0.3)" stroke="gold" strokeWidth="2" />
      )}
      {/* Ring */}
      {cell?.type === 'ring' && (
        <circle cx={x} cy={y} r={RING_R}
          fill={isSelected ? 'rgba(255,255,100,0.3)' : RING_FILL[cell.owner]}
          stroke={RING_STROKE[cell.owner]}
          strokeWidth={isSelected ? 4 : 3}
          opacity={isDragging ? 0.25 : 1}
        />
      )}
      {/* Marker */}
      {cell?.type === 'marker' && (
        <circle cx={x} cy={y} r={11}
          fill={MARKER_FILL[cell.colorUp]}
          stroke={MARKER_STROKE[cell.colorUp]}
          strokeWidth={1.5}
        />
      )}
      {/* Empty node */}
      {!cell && (
        <circle cx={x} cy={y} r={4}
          fill={isValidForDrop ? '#ffe066' : '#8aad8c'}
          stroke="none"
        />
      )}
      {/* foreignObject overlay for react-dnd (HTML needed for native DnD events) */}
      {(isDraggingActive || isValidForDrag) && (
        <foreignObject
          x={x - DROP_R} y={y - DROP_R}
          width={DROP_R * 2} height={DROP_R * 2}
          style={{ overflow: 'visible' }}>
          <div
            ref={combineRef}
            style={{
              width: DROP_R * 2,
              height: DROP_R * 2,
              borderRadius: '50%',
              background: showHover ? dropColor : 'transparent',
              border: showHover ? `2px solid ${dropBorder}` : '2px solid transparent',
              boxSizing: 'border-box',
              cursor: isValidForDrag ? (isDragging ? 'grabbing' : 'grab') : 'default',
            }}
          />
        </foreignObject>
      )}
    </g>
  );
}

// ─── Board SVG ────────────────────────────────────────────────────────────────
function Board({ state, onCellClick, onCellDrop }) {
  const { isDragging } = useDragLayer(m => ({ isDragging: m.isDragging() }));

  const validMoves = state.phase === 'play' && state.selectedRing
    ? getValidMoves(state, state.selectedRing)
    : [];
  const validSet = new Set(validMoves);

  return (
    <svg
      width={BOARD_SVG_SIZE} height={BOARD_SVG_SIZE}
      style={{ display: 'block', maxWidth: '100%', background: '#2c5f2e', borderRadius: 8 }}
    >
      {LINES.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="#4a7c59" strokeWidth="1.5" />
      ))}

      {VALID_CELL_KEYS.map(key => {
        const [q, r] = parseKey(key);
        const { x, y } = cellToPixel(q, r);
        const cell = state.board[key];
        return (
          <BoardCell
            key={key}
            cellKey={key} x={x} y={y} cell={cell}
            state={state}
            onCellClick={onCellClick}
            onCellDrop={onCellDrop}
            isDraggingActive={isDragging}
          />
        );
      })}
    </svg>
  );
}

// ─── Score track ─────────────────────────────────────────────────────────────
function ScoreTrack({ player, scored }) {
  const color = player === 'white' ? '#f0ede0' : '#1a1a1a';
  const bg = player === 'white' ? '#333' : '#eee';
  return (
    <div style={{ textAlign: 'center', padding: '8px 16px', background: bg, borderRadius: 8 }}>
      <div style={{ color, fontWeight: 'bold', marginBottom: 6, textTransform: 'capitalize' }}>{player}</div>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 28, height: 28, borderRadius: '50%', border: `3px solid ${color}`,
          background: i < scored ? color : 'transparent',
          display: 'inline-block', margin: '0 4px',
        }} />
      ))}
    </div>
  );
}

// ─── Info panel ──────────────────────────────────────────────────────────────
function InfoPanel({ state }) {
  const { phase, currentPlayer, resolvingPlayer, resolveStep, setupDone, winner, markersPool } = state;
  let msg = '';
  if (phase === 'setup') {
    msg = `Setup — ${currentPlayer}'s turn. Place ring ${setupDone[currentPlayer] + 1} of 5.`;
  } else if (phase === 'play') {
    msg = state.selectedRing
      ? `${currentPlayer}'s turn — Ring selected. Click or drag to a highlighted cell.`
      : `${currentPlayer}'s turn — Click or drag one of your rings.`;
  } else if (phase === 'resolveRows') {
    msg = resolveStep === 'selectRow'
      ? `${resolvingPlayer}: Click a highlighted row of 5 to remove it.`
      : `${resolvingPlayer}: Click one of your rings on the board to score it.`;
  } else if (phase === 'end') {
    msg = winner ? `${winner.toUpperCase()} WINS!` : 'DRAW — equal rings scored.';
  }
  return (
    <div style={{ padding: 12, background: '#1a2e1c', color: '#cde8cf', borderRadius: 8, minHeight: 60 }}>
      <div style={{ marginBottom: 4, fontSize: 13, color: '#6aab6e' }}>Markers remaining: {markersPool}</div>
      <div style={{ fontSize: 15 }}>{msg}</div>
    </div>
  );
}

// ─── Start screen ────────────────────────────────────────────────────────────
function StartScreen({ onStart }) {
  const [vsAI, setVsAI] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [blitz, setBlitz] = useState(false);
  return (
    <div style={{ textAlign: 'center', padding: 40, maxWidth: 400, margin: '0 auto' }}>
      <h1 style={{ color: '#cde8cf', marginBottom: 8 }}>YINSH</h1>
      <p style={{ color: '#8aad8c', marginBottom: 24 }}>Abstract strategy — first to score 3 rings wins</p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ color: '#cde8cf' }}>
          <input type="checkbox" checked={vsAI} onChange={e => setVsAI(e.target.checked)} style={{ marginRight: 8 }} />
          Play vs AI (Black)
        </label>
      </div>
      {vsAI && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#8aad8c', marginRight: 8 }}>Difficulty:</label>
          {['easy', 'medium', 'hard'].map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              style={{ margin: '0 4px', padding: '4px 12px', background: difficulty === d ? '#4a7c59' : '#1a2e1c', color: '#cde8cf', border: '1px solid #4a7c59', borderRadius: 4, cursor: 'pointer' }}>
              {d}
            </button>
          ))}
        </div>
      )}
      <div style={{ marginBottom: 24 }}>
        <label style={{ color: '#cde8cf' }}>
          <input type="checkbox" checked={blitz} onChange={e => setBlitz(e.target.checked)} style={{ marginRight: 8 }} />
          Blitz mode (1 ring to win)
        </label>
      </div>
      <button onClick={() => onStart({ vsAI, difficulty, blitz })}
        style={{ padding: '12px 32px', background: '#4a7c59', color: '#fff', border: 'none', borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>
        Start Game
      </button>
    </div>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [gameState, setGameState] = useState(null);

  const handleStart = useCallback((opts) => {
    setGameState(initState(opts));
  }, []);

  const handleCellClick = useCallback((key) => {
    if (!gameState) return;
    const { phase, currentPlayer, selectedRing, resolveStep, resolvingPlayer } = gameState;

    if (phase === 'setup') { setGameState(placeRingSetup(gameState, key)); return; }

    if (phase === 'resolveRows') {
      if (resolveStep === 'selectRow') {
        const rowIndex = gameState.pendingRows.findIndex(
          row => row.player === resolvingPlayer && row.cells.includes(key)
        );
        if (rowIndex >= 0) setGameState(removeRow(gameState, rowIndex));
        return;
      }
      if (resolveStep === 'selectRing') { setGameState(scoreRing(gameState, key)); return; }
    }

    if (phase !== 'play') return;
    const cell = gameState.board[key];

    if (cell?.type === 'ring' && cell.owner === currentPlayer) {
      setGameState(s => ({ ...s, selectedRing: selectedRing === key ? null : key }));
      return;
    }
    if (selectedRing) {
      const moves = getValidMoves(gameState, selectedRing);
      if (moves.includes(key)) { setGameState(applyMove(gameState, selectedRing, key)); return; }
    }
    if (selectedRing) setGameState(s => ({ ...s, selectedRing: null }));
  }, [gameState]);

  // Called when a ring is dropped onto a cell
  const handleCellDrop = useCallback((item, destKey) => {
    if (!gameState) return;
    const { phase } = gameState;
    if (item.source === 'board' && phase === 'play') {
      const moves = getValidMoves(gameState, item.fromKey);
      if (moves.includes(destKey)) setGameState(applyMove(gameState, item.fromKey, destKey));
    }
  }, [gameState]);

  // AI turn trigger
  useEffect(() => {
    if (!gameState) return;
    const { phase, currentPlayer, vsAI, aiPlayer, difficulty, resolvingPlayer } = gameState;
    if (phase === 'end') return;
    const isAITurn = vsAI && (
      (phase === 'setup' && currentPlayer === aiPlayer) ||
      (phase === 'play' && currentPlayer === aiPlayer) ||
      (phase === 'resolveRows' && resolvingPlayer === aiPlayer)
    );
    if (!isAITurn) return;
    const timer = setTimeout(() => {
      const move = getAIMove(gameState, aiPlayer, difficulty);
      if (!move) return;
      setGameState(s => {
        if (move.type === 'placeRing') return placeRingSetup(s, move.to);
        if (move.type === 'moveRing') return applyMove(s, move.from, move.to);
        if (move.type === 'removeRow') return removeRow(s, move.rowIndex);
        if (move.type === 'scoreRing') return scoreRing(s, move.ringKey);
        return s;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [gameState]);

  const touch = isTouchDevice();
  const backend = touch ? TouchBackend : HTML5Backend;
  const backendOptions = touch ? { enableMouseEvents: true } : {};

  if (!gameState) {
    return (
      <DndProvider backend={backend} options={backendOptions}>
        <div style={{ minHeight: '100vh', background: '#1a2e1c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <StartScreen onStart={handleStart} />
        </div>
      </DndProvider>
    );
  }

  return (
    <DndProvider backend={backend} options={backendOptions}>
      <div style={{ minHeight: '100vh', background: '#1a2e1c', padding: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>
          <ScoreTrack player="white" scored={gameState.ringsScored.white} />
          <div style={{ flex: '0 0 auto' }}>
            <Board
              state={gameState}
              onCellClick={handleCellClick}
              onCellDrop={handleCellDrop}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 160 }}>
            <ScoreTrack player="black" scored={gameState.ringsScored.black} />
            <InfoPanel state={gameState} />
            <button onClick={() => setGameState(null)}
              style={{ padding: '8px 16px', background: '#4a7c59', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
              New Game
            </button>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}

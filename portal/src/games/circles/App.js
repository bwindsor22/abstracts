import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import WinOverlay from '../../components/WinOverlay';
import {
  BOARD_SVG_SIZE, VALID_CELL_KEYS, DIRECTIONS,
  isValidCell, cellToPixel, coordKey, parseKey,
  initState, placeRingSetup, getValidMoves, applyMove, removeRow, scoreRing,
} from './Game';
import { getAIMove } from './AI/ai';
import { useDrag, useDrop, useDragLayer } from 'react-dnd';

const RING_TYPE = 'RING';


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
const RING_STROKE = { white: '#f0ede0', black: '#6b5b8a' };
const RING_FILL   = { white: 'rgba(240,237,224,0.15)', black: 'rgba(107,91,138,0.2)' };
const MARKER_FILL   = { white: '#f0ede0', black: '#4a3a6a' };
const MARKER_STROKE = { white: '#1a1a1a', black: '#9980c0' };

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
          fill={isValidForDrop ? '#ffe066' : 'rgba(153,66,240,0.35)'}
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

  return (
    <svg
      width={BOARD_SVG_SIZE} height={BOARD_SVG_SIZE}
      style={{ display: 'block', maxWidth: '100%', background: '#1a1030', borderRadius: 8, border: '1px solid rgba(153,66,240,0.2)' }}
    >
      {LINES.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke="rgba(153,66,240,0.25)" strokeWidth="1.5" />
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
  const color = player === 'white' ? '#f0ede0' : '#c8b8f8';
  const pieceColor = player === 'white' ? '#f0ede0' : '#1a1a1a';
  return (
    <div className="score-track">
      <div className="player-label" style={{ color }}>{player}</div>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 28, height: 28, borderRadius: '50%', border: `3px solid ${color}`,
          background: i < scored ? pieceColor : 'transparent',
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
    <div className="info-panel">
      <div className="markers-line">Markers remaining: {markersPool}</div>
      <div style={{ fontSize: 15 }}>{msg}</div>
    </div>
  );
}

// ─── Start screen ────────────────────────────────────────────────────────────
function StartScreen({ onStart, onBack }) {
  const [vsAI, setVsAI] = useState(true);
  const [difficulty, setDifficulty] = useState('medium');
  const [blitz, setBlitz] = useState(false);
  return (
    <div className="start-screen" style={{ textAlign: 'center' }}>
      <h1>CIRCLES</h1>
      <p className="start-desc">Abstract strategy — first to score 3 rings wins</p>
      <div style={{ marginBottom: 16 }}>
        <label className="start-checkbox">
          <input type="checkbox" checked={vsAI} onChange={e => setVsAI(e.target.checked)} style={{ marginRight: 8 }} />
          Play vs AI (Black)
        </label>
      </div>
      {vsAI && (
        <div className="difficulty-row">
          <label>Difficulty:</label>
          {['easy', 'medium', 'hard'].map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              className={`diff-btn${difficulty === d ? ' active' : ''}`}>
              {d}
            </button>
          ))}
        </div>
      )}
      <div style={{ marginBottom: 24 }}>
        <label className="blitz-row">
          <input type="checkbox" checked={blitz} onChange={e => setBlitz(e.target.checked)} style={{ marginRight: 8 }} />
          Blitz mode (1 ring to win)
        </label>
      </div>
      <button onClick={() => onStart({ vsAI, difficulty, blitz })} className="btn-primary">
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

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App({ onBack, onResult }) {
  const [gameState, setGameState] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const resultReported = useRef(false);

  const handleStart = useCallback((opts) => {
    setGameState(initState(opts));
    resultReported.current = false;
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

  // Report result once when game ends
  useEffect(() => {
    if (!gameState || gameState.phase !== 'end' || !gameState.winner || resultReported.current) return;
    resultReported.current = true;
    if (onResult) {
      onResult({
        gameId: 'circles',
        gameName: 'Circles',
        won: gameState.winner === 'white',
        moves: gameState.moveCount || 0,
        difficulty: gameState.difficulty || 'medium',
      });
    }
  }, [gameState, onResult]);

  if (!gameState) {
    return (
      <div className="game-circles" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <StartScreen onStart={handleStart} onBack={onBack} />
      </div>
    );
  }

  return (
      <div className="game-circles" style={{ padding: 20 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap' }}>
          <ScoreTrack player="white" scored={gameState.ringsScored.white} />
          <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Board
              state={gameState}
              onCellClick={handleCellClick}
              onCellDrop={handleCellDrop}
            />

            {/* Bottom controls */}
            <div className="game-controls">
              <button className="ctrl-btn" disabled>UNDO</button>
              <button className="ctrl-btn" onClick={() => setMenuOpen(true)}>MENU</button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 160 }}>
            <ScoreTrack player="black" scored={gameState.ringsScored.black} />
            <InfoPanel state={gameState} />
          </div>
        </div>

        {/* Win overlay */}
        {gameState.phase === 'end' && gameState.winner && (
          <WinOverlay
            title={gameState.vsAI ? (gameState.winner === 'white' ? 'YOU WIN!' : 'AI WINS!') : `${gameState.winner === 'white' ? 'White' : 'Black'} wins!`}
            subtitle="Scored 3 rings"
            onNewGame={() => setGameState(null)}
            onHome={onBack}
          />
        )}

        {/* In-game menu overlay */}
        {menuOpen && (
          <div className="game-menu-overlay" onClick={() => setMenuOpen(false)}>
            <div className="game-menu-panel" onClick={e => e.stopPropagation()}>
              <button onClick={() => setMenuOpen(false)}>Resume</button>
              <button onClick={() => { setGameState(null); setMenuOpen(false); }}>New Game</button>
              {onBack && <button onClick={onBack}>Back to Library</button>}
            </div>
          </div>
        )}
      </div>
  );
}

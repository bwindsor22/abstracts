import React, { useState, useCallback, useEffect, useRef } from 'react';
import { DndProvider, useDrag } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import './App.css';
import {
  RADIUS, DIRS, isValid, key, parseKey,
  initState, getAllMoves, applyMoveFixed,
} from './Game';
import { getAIMove } from './AI/ai';

// ─── Board geometry ───────────────────────────────────────────────────────────
const CELL_SIZE = 34;
const SVG_SIZE = 500;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;

function cellToPixel(q, r) {
  return {
    x: CX + CELL_SIZE * (q + r * 0.5),
    y: CY + CELL_SIZE * (r * Math.sqrt(3) / 2),
  };
}

// Precompute all valid cells
const ALL_CELLS = [];
for (let q = -RADIUS; q <= RADIUS; q++)
  for (let r = -RADIUS; r <= RADIUS; r++)
    if (isValid(q, r)) ALL_CELLS.push(key(q, r));

// ─── Colours ─────────────────────────────────────────────────────────────────
const MARBLE_COLOR = { black: '#222', white: '#f5f5f5' };
const MARBLE_STROKE = { black: '#555', white: '#aaa' };

// ─── Touch detection ─────────────────────────────────────────────────────────
function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// ─── Direction arrow geometry ─────────────────────────────────────────────────
function getArrowDescriptors(cx, cy) {
  return DIRS.map(([dq, dr]) => {
    const neighborPixel = cellToPixel(dq, dr);
    const dx = neighborPixel.x - CX;
    const dy = neighborPixel.y - CY;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = dx / len;
    const ny = dy / len;
    const ARROW_DIST = CELL_SIZE * 1.55;
    const ax = cx + nx * ARROW_DIST;
    const ay = cy + ny * ARROW_DIST;

    const HEAD = 10;
    const DEPTH = 13;
    const px = -ny;
    const py = nx;
    const tip = [ax + nx * DEPTH * 0.5, ay + ny * DEPTH * 0.5];
    const base1 = [ax - nx * DEPTH * 0.5 + px * HEAD, ay - ny * DEPTH * 0.5 + py * HEAD];
    const base2 = [ax - nx * DEPTH * 0.5 - px * HEAD, ay - ny * DEPTH * 0.5 - py * HEAD];

    return {
      dir: [dq, dr],
      points: `${tip[0]},${tip[1]} ${base1[0]},${base1[1]} ${base2[0]},${base2[1]}`,
      cx: ax,
      cy: ay,
    };
  });
}

// ─── Start screen ─────────────────────────────────────────────────────────────
function StartScreen({ onStart, onBack }) {
  const [vsAI, setVsAI] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  return (
    <div className="start-screen" style={{ textAlign: 'center' }}>
      <h1>ABALONE</h1>
      <p className="start-desc">Push 6 opponent marbles off the board</p>
      <p className="start-rule">
        Select 1–3 aligned marbles, then click a direction arrow to move.<br/>
        Black moves first.
      </p>

      <div style={{ marginBottom: 16 }}>
        <label className="start-checkbox">
          <input type="checkbox" checked={vsAI} onChange={e => setVsAI(e.target.checked)} style={{ marginRight: 8 }} />
          Play vs AI (White)
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

      <button onClick={() => onStart({ vsAI, difficulty })} className="btn-primary">
        Start Game
      </button>
      {onBack && (
        <div style={{ marginTop: 16 }}>
          <button onClick={onBack} className="diff-btn">← Library</button>
        </div>
      )}
    </div>
  );
}

// ─── Draggable marble wrapper ────────────────────────────────────────────────
const DRAG_TYPE = 'MARBLE';

function DraggableMarbleOverlay({ cellKey, cx, cy, radius, onDragEnd }) {
  const [{ isDragging }, drag] = useDrag({
    item: { type: DRAG_TYPE, cellKey },
    end: (item, monitor) => {
      const offset = monitor.getClientOffset();
      const initial = monitor.getInitialClientOffset();
      if (offset && initial) {
        onDragEnd(cellKey, initial, offset);
      }
    },
    collect: monitor => ({ isDragging: monitor.isDragging() }),
  });

  return (
    <foreignObject
      ref={drag}
      x={cx - radius}
      y={cy - radius}
      width={radius * 2}
      height={radius * 2}
      style={{ opacity: isDragging ? 0.3 : 0, cursor: 'grab', pointerEvents: 'all' }}
    >
      <div style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
    </foreignObject>
  );
}

// ─── App (inner, inside DndProvider) ─────────────────────────────────────────
function AppInner({ onBack, onResult }) {
  const [gameState, setGameState] = useState(null);
  const [selected, setSelected] = useState([]);
  const [validMoves, setValidMoves] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const resultReported = useRef(false);

  const handleStart = useCallback((opts) => {
    setGameState(initState(opts));
    setSelected([]);
    setValidMoves([]);
    resultReported.current = false;
  }, []);

  // Recompute valid moves whenever selection changes
  useEffect(() => {
    if (!gameState || selected.length === 0) { setValidMoves([]); return; }
    const allMoves = getAllMoves(gameState, gameState.currentPlayer);
    const relevant = allMoves.filter(m => {
      const mSet = new Set(m.marbles);
      return selected.every(k => mSet.has(k)) && mSet.size === selected.length;
    });
    setValidMoves(relevant);
  }, [gameState, selected]);

  const handleCellClick = useCallback((cellKey) => {
    if (!gameState || gameState.winner) return;
    if (gameState.vsAI && gameState.currentPlayer === gameState.aiPlayer) return;

    const { board, currentPlayer } = gameState;
    const cellOwner = board[cellKey];

    if (cellOwner === currentPlayer) {
      setSelected(prev => {
        if (prev.includes(cellKey)) return prev.filter(k => k !== cellKey);
        if (prev.length >= 3) return prev;
        const next = [...prev, cellKey];
        if (next.length <= 1) return next;
        const positions = next.map(parseKey);
        const isCollinear = DIRS.some(([dq, dr]) => {
          const scores = positions.map(([q, r]) => q * dq + r * dr);
          const min = Math.min(...scores), max = Math.max(...scores);
          if (max - min !== next.length - 1) return false;
          const base = positions[scores.indexOf(min)];
          return positions.every(([q, r]) => {
            const s = q * dq + r * dr - min;
            return q === base[0] + dq * s && r === base[1] + dr * s;
          });
        });
        if (!isCollinear) return prev;
        return next;
      });
      return;
    }

    for (const move of validMoves) {
      const [dq, dr] = move.dir;
      const marbles = move.marbles.map(parseKey);
      if (move.type === 'inline') {
        const leading = marbles.reduce((b, m) => (m[0] * dq + m[1] * dr > b[0] * dq + b[1] * dr ? m : b));
        const dest = key(leading[0] + dq, leading[1] + dr);
        if (dest === cellKey) {
          setGameState(s => applyMoveFixed(s, move));
          setSelected([]); setValidMoves([]);
          return;
        }
      } else {
        const destKeys = marbles.map(([q, r]) => key(q + dq, r + dr));
        if (destKeys.includes(cellKey)) {
          setGameState(s => applyMoveFixed(s, move));
          setSelected([]); setValidMoves([]);
          return;
        }
      }
    }

    setSelected([]);
  }, [gameState, validMoves]);

  const handleDirClick = useCallback((dir) => {
    if (validMoves.length === 0) return;
    const [dq, dr] = dir;
    const move = validMoves.find(m => m.dir[0] === dq && m.dir[1] === dr);
    if (!move) return;
    setGameState(s => applyMoveFixed(s, move));
    setSelected([]); setValidMoves([]);
  }, [validMoves]);

  const handleMarbleDragEnd = useCallback((cellKey, startOffset, endOffset) => {
    if (!gameState || gameState.winner) return;
    if (gameState.vsAI && gameState.currentPlayer === gameState.aiPlayer) return;
    const { board, currentPlayer } = gameState;
    if (board[cellKey] !== currentPlayer) return;

    const dx = endOffset.x - startOffset.x;
    const dy = endOffset.y - startOffset.y;
    if (Math.sqrt(dx * dx + dy * dy) < 10) return;

    let bestDir = null;
    let bestDot = -Infinity;
    for (const [dq, dr] of DIRS) {
      const neighbor = cellToPixel(dq, dr);
      const vx = neighbor.x - CX;
      const vy = neighbor.y - CY;
      const len = Math.sqrt(vx * vx + vy * vy);
      const dot = (dx * vx + dy * vy) / len;
      if (dot > bestDot) { bestDot = dot; bestDir = [dq, dr]; }
    }
    if (!bestDir) return;

    let workingSelected = selected;
    if (!selected.includes(cellKey)) {
      workingSelected = [cellKey];
      setSelected(workingSelected);
    }

    const allMoves = getAllMoves(gameState, currentPlayer);
    const relevant = allMoves.filter(m => {
      const mSet = new Set(m.marbles);
      return workingSelected.every(k => mSet.has(k)) && mSet.size === workingSelected.length;
    });
    const move = relevant.find(m => m.dir[0] === bestDir[0] && m.dir[1] === bestDir[1]);
    if (!move) return;

    setGameState(s => applyMoveFixed(s, move));
    setSelected([]); setValidMoves([]);
  }, [gameState, selected]);

  // AI turn
  useEffect(() => {
    if (!gameState || gameState.winner) return;
    if (!gameState.vsAI || gameState.currentPlayer !== gameState.aiPlayer) return;
    const timer = setTimeout(() => {
      const move = getAIMove(gameState, gameState.aiPlayer, gameState.difficulty);
      if (!move) return;
      setGameState(s => applyMoveFixed(s, move));
    }, 400);
    return () => clearTimeout(timer);
  }, [gameState]);

  // Report result once
  useEffect(() => {
    if (!gameState?.winner || resultReported.current) return;
    resultReported.current = true;
    if (onResult) {
      onResult({
        gameId: 'marbles',
        gameName: 'Marbles',
        won: gameState.winner === 'black',
        moves: gameState.moveCount || 0,
        difficulty: gameState.difficulty || 'medium',
      });
    }
  }, [gameState?.winner, onResult]);

  if (!gameState) {
    return (
      <div className="game-marbles" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <StartScreen onStart={handleStart} onBack={onBack} />
      </div>
    );
  }

  const { board, currentPlayer, captured, winner, vsAI, aiPlayer } = gameState;
  const selectedSet = new Set(selected);
  const isPlayerTurn = !winner && (!vsAI || currentPlayer !== aiPlayer);

  const destHighlights = new Set();
  for (const move of validMoves) {
    const [dq, dr] = move.dir;
    if (move.type === 'inline') {
      const marbles = move.marbles.map(parseKey);
      const leading = marbles.reduce((b, m) => (m[0] * dq + m[1] * dr > b[0] * dq + b[1] * dr ? m : b));
      destHighlights.add(key(leading[0] + dq, leading[1] + dr));
    } else {
      for (const [mq, mr] of move.marbles.map(parseKey)) {
        destHighlights.add(key(mq + dq, mr + dr));
      }
    }
  }

  const availDirSet = new Set(validMoves.map(m => `${m.dir[0]},${m.dir[1]}`));

  let arrowDescriptors = [];
  if (selected.length > 0 && isPlayerTurn) {
    let sumX = 0, sumY = 0;
    for (const k of selected) {
      const [q, r] = parseKey(k);
      const { x, y } = cellToPixel(q, r);
      sumX += x; sumY += y;
    }
    const centX = sumX / selected.length;
    const centY = sumY / selected.length;
    arrowDescriptors = getArrowDescriptors(centX, centY);
  }

  const statusMsg = winner
    ? `${winner.toUpperCase()} WINS!`
    : vsAI && currentPlayer === aiPlayer
    ? 'AI is thinking...'
    : `${currentPlayer === 'black' ? 'Black' : 'White'}'s turn`;

  return (
    <div className="game-marbles" style={{ padding: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        {/* Score */}
        <div className="score-row">
          <span>Black captured: <b style={{ color: '#f5f5f5' }}>{captured.black}</b>/6</span>
          <span className="status-bar" style={{ color: winner ? '#ffe066' : currentPlayer === 'black' ? '#aaa' : '#4f7fd9' }}>{statusMsg}</span>
          <span>White captured: <b style={{ color: '#aaa' }}>{captured.white}</b>/6</span>
        </div>

        {/* Board */}
        <svg width={SVG_SIZE} height={SVG_SIZE} style={{ display: 'block', background: '#191022', borderRadius: '50%', border: '2px solid rgba(153,66,240,0.2)' }}>
          {ALL_CELLS.map(k => {
            const [q, r] = parseKey(k);
            const { x, y } = cellToPixel(q, r);
            const marble = board[k];
            const isSel = selectedSet.has(k);
            const isDest = destHighlights.has(k);
            const isOwn = marble === currentPlayer && isPlayerTurn;
            return (
              <g key={k} onClick={() => handleCellClick(k)} style={{ cursor: isOwn || isDest ? 'pointer' : 'default' }}>
                <circle cx={x} cy={y} r={CELL_SIZE * 0.45}
                  fill={isSel ? 'rgba(255,230,0,0.3)' : isDest ? 'rgba(153,66,240,0.25)' : 'rgba(42,31,69,0.8)'}
                  stroke={isSel ? '#ffe066' : isDest ? '#9942f0' : '#3d2a5a'}
                  strokeWidth={isSel || isDest ? 2 : 1}
                />
                {marble && (
                  <circle cx={x} cy={y} r={CELL_SIZE * 0.38}
                    fill={MARBLE_COLOR[marble]}
                    stroke={isSel ? '#ffe066' : MARBLE_STROKE[marble]}
                    strokeWidth={isSel ? 3 : 2}
                  />
                )}
                {isDest && !marble && (
                  <circle cx={x} cy={y} r={5} fill="#9942f0" opacity={0.8} />
                )}
                {marble && isOwn && (
                  <DraggableMarbleOverlay
                    cellKey={k}
                    cx={x}
                    cy={y}
                    radius={CELL_SIZE * 0.38}
                    onDragEnd={handleMarbleDragEnd}
                  />
                )}
              </g>
            );
          })}

          {arrowDescriptors.map(({ dir, points, cx: ax, cy: ay }) => {
            const dirKey = `${dir[0]},${dir[1]}`;
            const available = availDirSet.has(dirKey);
            return (
              <g
                key={dirKey}
                onClick={available ? (e) => { e.stopPropagation(); handleDirClick(dir); } : undefined}
                style={{ cursor: available ? 'pointer' : 'default' }}
              >
                <circle
                  cx={ax} cy={ay} r={14}
                  fill={available ? 'rgba(153,66,240,0.85)' : 'rgba(42,31,69,0.6)'}
                  stroke={available ? '#9942f0' : '#3d2a5a'}
                  strokeWidth={1}
                />
                <polygon
                  points={points}
                  fill={available ? '#d4a0ff' : '#444'}
                  opacity={available ? 0.95 : 0.4}
                />
              </g>
            );
          })}
        </svg>

        {selected.length > 0 && isPlayerTurn && (
          <div className="selection-hint">
            {selected.length} marble{selected.length > 1 ? 's' : ''} selected — click an arrow or drag to move
          </div>
        )}

        {/* Bottom controls */}
        <div className="game-controls">
          <button className="ctrl-btn" disabled>UNDO</button>
          <button className="ctrl-btn" onClick={() => setMenuOpen(true)}>MENU</button>
        </div>
      </div>

      {/* In-game menu overlay */}
      {menuOpen && (
        <div className="game-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="game-menu-panel" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(false)}>Resume</button>
            <button onClick={() => { setGameState(null); setSelected([]); setValidMoves([]); setMenuOpen(false); }}>New Game</button>
            {onBack && <button onClick={onBack}>Back to Library</button>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App root with DndProvider ────────────────────────────────────────────────
const backend = isTouchDevice() ? TouchBackend : HTML5Backend;
const backendOptions = isTouchDevice() ? { enableMouseEvents: true } : undefined;

export default function App({ onBack, onResult }) {
  return (
    <DndProvider backend={backend} options={backendOptions}>
      <AppInner onBack={onBack} onResult={onResult} />
    </DndProvider>
  );
}

import React, { useState, useCallback, useEffect } from 'react';
import './App.css';
import { SIZE, initState, getPawnMoves, canPlaceWall, applyMove } from './Game';
import { getAIMove } from './AI/ai';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

const ITEM_TYPES = { WALL: 'wall' };

const CELL = 52;
const WALL_W = 10;
const PAD = 24;

const BG = '#1a2e1c';
const GRID_COLOR = '#3a6b42';
const P1_COLOR = '#d94f4f';
const P2_COLOR = '#4f7fd9';

function cellPos(row, col) {
  return { x: PAD + col * (CELL + 2), y: PAD + row * (CELL + 2) };
}

// ── Draggable wall token ──────────────────────────────────────────────────────
function WallToken({ orient, color, small }) {
  const [{ isDragging }, drag] = useDrag({
    item: { type: ITEM_TYPES.WALL, orient },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const isH = orient === 'h';
  const w = small ? (isH ? 34 : 10) : (isH ? 44 : 12);
  const h = small ? (isH ? 10 : 34) : (isH ? 12 : 44);

  return (
    <div
      ref={drag}
      title={isH ? 'Horizontal wall' : 'Vertical wall'}
      style={{
        width: w,
        height: h,
        background: isDragging ? 'rgba(255,224,102,0.3)' : color,
        border: `2px solid ${isDragging ? 'rgba(255,224,102,0.4)' : '#ffe066'}`,
        borderRadius: 3,
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.4 : 1,
        flexShrink: 0,
        boxShadow: isDragging ? 'none' : '0 2px 4px rgba(0,0,0,0.4)',
        transition: 'opacity 0.15s',
      }}
    />
  );
}

// ── Wall supply panel for one player ─────────────────────────────────────────
function WallSupply({ player, wallsLeft, isCurrentPlayer }) {
  const color = player === 'p1' ? P1_COLOR : P2_COLOR;
  const label = player === 'p1' ? 'Red' : 'Blue';
  const count = wallsLeft[player];
  const canDrag = isCurrentPlayer && count > 0;

  // Show up to 10 tokens, grayed out when exhausted
  const totalSlots = 10;

  return (
    <div style={{
      padding: '10px 14px',
      background: isCurrentPlayer ? 'rgba(74,124,89,0.25)' : 'rgba(0,0,0,0.15)',
      border: `1px solid ${isCurrentPlayer ? color : 'rgba(74,124,89,0.3)'}`,
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 160,
    }}>
      <div style={{ color, fontSize: 13, fontWeight: 'bold', textAlign: 'center' }}>
        {label} — {count} wall{count !== 1 ? 's' : ''} left
      </div>

      {/* H-wall tokens row */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ color: '#8aad8c', fontSize: 11, textAlign: 'center' }}>
          {isCurrentPlayer && count > 0 ? 'drag to place →' : ''}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
          {Array.from({ length: totalSlots }, (_, i) => {
            const active = i < count;
            if (active && canDrag) {
              return <WallToken key={`h-${i}`} orient="h" color={color} small />;
            }
            return (
              <div key={`h-${i}`} style={{
                width: 34, height: 10,
                background: active ? color : 'rgba(255,255,255,0.07)',
                border: `2px solid ${active ? 'rgba(255,224,102,0.4)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 3,
                opacity: active ? 0.5 : 0.2,
              }} />
            );
          })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, justifyContent: 'center' }}>
          {Array.from({ length: totalSlots }, (_, i) => {
            const active = i < count;
            if (active && canDrag) {
              return <WallToken key={`v-${i}`} orient="v" color={color} small />;
            }
            return (
              <div key={`v-${i}`} style={{
                width: 10, height: 34,
                background: active ? color : 'rgba(255,255,255,0.07)',
                border: `2px solid ${active ? 'rgba(255,224,102,0.4)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 3,
                opacity: active ? 0.5 : 0.2,
              }} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── The board SVG with droppable wall slots ───────────────────────────────────
function Board({ gs, onCellClick, onWallDrop }) {
  const { pawns, walls, currentPlayer, winner, vsAI, aiPlayer } = gs;

  const validMoves = !winner && !(vsAI && currentPlayer === aiPlayer)
    ? getPawnMoves(gs, currentPlayer)
    : [];
  const validMoveSet = new Set(validMoves.map(m => `${m.row},${m.col}`));

  const svgSize = PAD * 2 + SIZE * CELL + (SIZE - 1) * 2;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg width={svgSize} height={svgSize} style={{ display: 'block', background: '#2c5f2e', borderRadius: 8 }}>
        {/* Cells */}
        {Array.from({ length: SIZE }, (_, row) =>
          Array.from({ length: SIZE }, (_, col) => {
            const { x, y } = cellPos(row, col);
            const isValidMove = validMoveSet.has(`${row},${col}`);
            const isP1 = pawns.p1.row === row && pawns.p1.col === col;
            const isP2 = pawns.p2.row === row && pawns.p2.col === col;
            return (
              <g key={`${row},${col}`}
                onClick={() => isValidMove && onCellClick(row, col)}
                style={{ cursor: isValidMove ? 'pointer' : 'default' }}>
                <rect x={x} y={y} width={CELL} height={CELL}
                  fill={isValidMove ? 'rgba(255,230,0,0.15)' : 'rgba(0,0,0,0.2)'}
                  stroke={GRID_COLOR} strokeWidth={1} />
                {isP1 && <circle cx={x + CELL / 2} cy={y + CELL / 2} r={CELL * 0.35} fill={P1_COLOR} stroke="#8b1a1a" strokeWidth={2} />}
                {isP2 && <circle cx={x + CELL / 2} cy={y + CELL / 2} r={CELL * 0.35} fill={P2_COLOR} stroke="#1a3d8b" strokeWidth={2} />}
                {isValidMove && !isP1 && !isP2 && <circle cx={x + CELL / 2} cy={y + CELL / 2} r={5} fill="rgba(255,230,0,0.6)" />}
              </g>
            );
          })
        )}

        {/* Placed walls */}
        {Object.keys(walls).map(wk => {
          const [r, c, orient] = wk.split(',');
          const row = parseInt(r), col = parseInt(c);
          const { x, y } = cellPos(row, col);
          if (orient === 'h') {
            return <rect key={wk} x={x} y={y + CELL - 2} width={CELL * 2 + 2} height={WALL_W} fill="#ffe066" rx={2} />;
          } else {
            return <rect key={wk} x={x + CELL - 2} y={y} width={WALL_W} height={CELL * 2 + 2} fill="#ffe066" rx={2} />;
          }
        })}
      </svg>

      {/* Droppable wall slot overlays — rendered as HTML divs on top of SVG */}
      <WallSlotOverlays gs={gs} onWallDrop={onWallDrop} svgSize={svgSize} />
    </div>
  );
}

// ── Individual droppable slot ─────────────────────────────────────────────────
function HWallSlot({ gs, row, col, onWallDrop }) {
  const { x, y } = cellPos(row, col);
  const valid = canPlaceWall(gs, row, col, 'h');

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPES.WALL,
    drop: () => onWallDrop(row, col, 'h'),
    canDrop: () => valid,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const wy = y + CELL - 2;
  const slotH = WALL_W + 6;
  const slotW = CELL * 2 + 2;

  return (
    <div
      ref={drop}
      style={{
        position: 'absolute',
        left: x,
        top: wy - 3,
        width: slotW,
        height: slotH,
        background: isOver && canDrop
          ? 'rgba(255,224,102,0.75)'
          : isOver && !canDrop
            ? 'rgba(255,60,60,0.4)'
            : 'rgba(255,224,102,0.08)',
        border: `1px solid ${isOver && canDrop ? '#ffe066' : isOver ? '#f55' : 'rgba(255,224,102,0.2)'}`,
        borderRadius: 2,
        pointerEvents: valid ? 'auto' : 'none',
        cursor: isOver && canDrop ? 'copy' : 'default',
        transition: 'background 0.1s',
        boxSizing: 'border-box',
      }}
    />
  );
}

function VWallSlot({ gs, row, col, onWallDrop }) {
  const { x, y } = cellPos(row, col);
  const valid = canPlaceWall(gs, row, col, 'v');

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPES.WALL,
    drop: () => onWallDrop(row, col, 'v'),
    canDrop: () => valid,
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  const wx = x + CELL - 2;
  const slotW = WALL_W + 6;
  const slotH = CELL * 2 + 2;

  return (
    <div
      ref={drop}
      style={{
        position: 'absolute',
        left: wx - 3,
        top: y,
        width: slotW,
        height: slotH,
        background: isOver && canDrop
          ? 'rgba(255,224,102,0.75)'
          : isOver && !canDrop
            ? 'rgba(255,60,60,0.4)'
            : 'rgba(255,224,102,0.08)',
        border: `1px solid ${isOver && canDrop ? '#ffe066' : isOver ? '#f55' : 'rgba(255,224,102,0.2)'}`,
        borderRadius: 2,
        pointerEvents: valid ? 'auto' : 'none',
        cursor: isOver && canDrop ? 'copy' : 'default',
        transition: 'background 0.1s',
        boxSizing: 'border-box',
      }}
    />
  );
}

// ── Container for all wall slot overlays ─────────────────────────────────────
function WallSlotOverlays({ gs, onWallDrop, svgSize }) {
  const { currentPlayer, winner, wallsLeft, vsAI, aiPlayer } = gs;
  const isPlayerTurn = !winner && !(vsAI && currentPlayer === aiPlayer);
  const hasWalls = wallsLeft[currentPlayer] > 0;

  if (!isPlayerTurn || !hasWalls) return null;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: svgSize, height: svgSize, pointerEvents: 'none' }}>
      {Array.from({ length: SIZE - 1 }, (_, row) =>
        Array.from({ length: SIZE - 1 }, (_, col) => (
          <React.Fragment key={`slots-${row}-${col}`}>
            <HWallSlot gs={gs} row={row} col={col} onWallDrop={onWallDrop} />
            <VWallSlot gs={gs} row={row} col={col} onWallDrop={onWallDrop} />
          </React.Fragment>
        ))
      )}
    </div>
  );
}

// ── Start screen ─────────────────────────────────────────────────────────────
function StartScreen({ onStart }) {
  const [vsAI, setVsAI] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  return (
    <div style={{ textAlign: 'center', padding: 40, maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ color: '#cde8cf', marginBottom: 8 }}>QUORIDOR</h1>
      <p style={{ color: '#8aad8c', marginBottom: 6 }}>Reach the opposite side first</p>
      <p style={{ color: '#6aab6e', fontSize: 13, marginBottom: 24 }}>
        <span style={{ color: P1_COLOR }}>Red (P1)</span> starts at top, reaches bottom row.<br />
        <span style={{ color: P2_COLOR }}>Blue (P2)</span> starts at bottom, reaches top row.<br />
        Each player has {SIZE === 9 ? 10 : 5} walls to place.
      </p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ color: '#cde8cf' }}>
          <input type="checkbox" checked={vsAI} onChange={e => setVsAI(e.target.checked)} style={{ marginRight: 8 }} />
          Play vs AI (Blue)
        </label>
      </div>
      {vsAI && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#8aad8c', marginRight: 8 }}>Difficulty:</label>
          {['easy', 'medium', 'hard'].map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              style={{ margin: '0 4px', padding: '4px 12px', background: difficulty === d ? '#4a7c59' : BG, color: '#cde8cf', border: '1px solid #4a7c59', borderRadius: 4, cursor: 'pointer' }}>
              {d}
            </button>
          ))}
        </div>
      )}
      <button onClick={() => onStart({ vsAI, difficulty })}
        style={{ padding: '12px 32px', background: '#4a7c59', color: '#fff', border: 'none', borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>
        Start Game
      </button>
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────
function GameUI() {
  const [gs, setGs] = useState(null);

  const handleStart = useCallback((opts) => {
    setGs(initState(opts));
  }, []);

  const handleCellClick = useCallback((row, col) => {
    if (!gs || gs.winner) return;
    if (gs.vsAI && gs.currentPlayer === gs.aiPlayer) return;
    const validMoves = getPawnMoves(gs, gs.currentPlayer);
    const m = validMoves.find(v => v.row === row && v.col === col);
    if (m) setGs(s => applyMove(s, m));
  }, [gs]);

  const handleWallDrop = useCallback((r, c, orient) => {
    if (!gs || gs.winner) return;
    if (gs.vsAI && gs.currentPlayer === gs.aiPlayer) return;
    if (canPlaceWall(gs, r, c, orient)) {
      setGs(s => applyMove(s, { type: 'wall', r, c, orient }));
    }
  }, [gs]);

  // AI turn
  useEffect(() => {
    if (!gs || gs.winner) return;
    if (!gs.vsAI || gs.currentPlayer !== gs.aiPlayer) return;
    const timer = setTimeout(() => {
      const move = getAIMove(gs, gs.aiPlayer, gs.difficulty);
      if (move) setGs(s => applyMove(s, move));
    }, 300);
    return () => clearTimeout(timer);
  }, [gs]);

  if (!gs) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <StartScreen onStart={handleStart} />
      </div>
    );
  }

  const { wallsLeft, currentPlayer, winner, vsAI, aiPlayer } = gs;
  const cpColor = currentPlayer === 'p1' ? P1_COLOR : P2_COLOR;
  const statusMsg = winner
    ? `${winner === 'p1' ? 'RED' : 'BLUE'} WINS!`
    : vsAI && currentPlayer === aiPlayer ? 'AI thinking...'
    : `${currentPlayer === 'p1' ? 'Red' : 'Blue'}'s turn`;

  const isPlayerTurn = !winner && !(vsAI && currentPlayer === aiPlayer);
  const hint = isPlayerTurn && wallsLeft[currentPlayer] > 0
    ? 'Click a yellow cell to move, or drag a wall token onto the board'
    : isPlayerTurn
      ? 'Click a yellow cell to move (no walls left)'
      : '';

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '16px 12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>

        {/* Status */}
        <div style={{ color: winner ? '#ffe066' : cpColor, fontSize: 20, fontWeight: 'bold', letterSpacing: 1 }}>
          {statusMsg}
        </div>

        {hint && (
          <div style={{ color: '#6aab6e', fontSize: 12, textAlign: 'center' }}>{hint}</div>
        )}

        {/* Board */}
        <Board gs={gs} onCellClick={handleCellClick} onWallDrop={handleWallDrop} />

        {/* Wall supply panels */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <WallSupply player="p1" wallsLeft={wallsLeft} isCurrentPlayer={currentPlayer === 'p1' && !winner} />
          <WallSupply player="p2" wallsLeft={wallsLeft} isCurrentPlayer={currentPlayer === 'p2' && !winner} />
        </div>

        <button onClick={() => setGs(null)}
          style={{ padding: '8px 20px', background: '#4a7c59', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', marginTop: 4 }}>
          New Game
        </button>
      </div>
    </div>
  );
}

// Computed once at module load — never changes, so DndProvider never remounts
const _backend = isTouchDevice() ? TouchBackend : HTML5Backend;
const _options = isTouchDevice() ? { enableMouseEvents: true } : undefined;

export default function App() {
  return (
    <DndProvider backend={_backend} options={_options}>
      <GameUI />
    </DndProvider>
  );
}

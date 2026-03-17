import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import { SIZE, initState, getPawnMoves, canPlaceWall, applyMove } from './Game';
import { getAIMove } from './AI/ai';
import { useDrag, useDrop } from 'react-dnd';

const ITEM_TYPES = { WALL: 'wall' };

const CELL = 52;
const WALL_W = 10;
const PAD = 24;

const BG = '#191022';
const GRID_COLOR = 'rgba(153,66,240,0.2)';
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

// ── Wall supply panel ─────────────────────────────────────────────────────────
function WallSupply({ player, wallsLeft, isCurrentPlayer }) {
  const color = player === 'p1' ? P1_COLOR : P2_COLOR;
  const label = player === 'p1' ? 'Red' : 'Blue';
  const count = wallsLeft[player];
  const canDrag = isCurrentPlayer && count > 0;
  const totalSlots = 10;

  return (
    <div style={{
      padding: '10px 14px',
      background: isCurrentPlayer ? 'rgba(153,66,240,0.12)' : 'rgba(0,0,0,0.15)',
      border: `1px solid ${isCurrentPlayer ? color : 'rgba(153,66,240,0.15)'}`,
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      minWidth: 160,
    }}>
      <div style={{ color, fontSize: 13, fontWeight: 'bold', textAlign: 'center', fontFamily: 'Space Grotesk, sans-serif' }}>
        {label} — {count} wall{count !== 1 ? 's' : ''} left
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ color: 'rgba(240,238,255,0.35)', fontSize: 11, textAlign: 'center' }}>
          {isCurrentPlayer && count > 0 ? 'drag to place →' : ''}
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

// ── Board SVG ─────────────────────────────────────────────────────────────────
function Board({ gs, onCellClick, onWallDrop, isPlayerTurn }) {
  const { pawns, walls, currentPlayer, winner, vsAI, aiPlayer } = gs;

  const humanSide = vsAI ? (aiPlayer === 'p1' ? 'p2' : 'p1') : currentPlayer;
  const validMoves = !winner ? getPawnMoves(gs, humanSide) : [];
  const validMoveSet = new Set(validMoves.map(m => `${m.row},${m.col}`));

  const svgSize = PAD * 2 + SIZE * CELL + (SIZE - 1) * 2;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg width={svgSize} height={svgSize} style={{ display: 'block', background: '#1a1030', borderRadius: 8, border: '1px solid rgba(153,66,240,0.2)' }}>
        {Array.from({ length: SIZE }, (_, row) =>
          Array.from({ length: SIZE }, (_, col) => {
            const { x, y } = cellPos(row, col);
            const isValidMove = validMoveSet.has(`${row},${col}`);
            const isP1 = pawns.p1.row === row && pawns.p1.col === col;
            const isP2 = pawns.p2.row === row && pawns.p2.col === col;
            return (
              <g key={`${row},${col}`}
                onClick={() => isValidMove && isPlayerTurn && onCellClick(row, col)}
                style={{ cursor: isValidMove && isPlayerTurn ? 'pointer' : 'default' }}>
                <rect x={x} y={y} width={CELL} height={CELL}
                  fill={isValidMove ? 'rgba(255,230,0,0.12)' : 'rgba(42,31,69,0.5)'}
                  stroke={GRID_COLOR} strokeWidth={1} />
                {isP1 && <circle cx={x + CELL / 2} cy={y + CELL / 2} r={CELL * 0.35} fill={P1_COLOR} stroke="#8b1a1a" strokeWidth={2} />}
                {isP2 && <circle cx={x + CELL / 2} cy={y + CELL / 2} r={CELL * 0.35} fill={P2_COLOR} stroke="#1a3d8b" strokeWidth={2} />}
                {isValidMove && !isP1 && !isP2 && <circle cx={x + CELL / 2} cy={y + CELL / 2} r={5} fill="rgba(255,230,0,0.6)" />}
              </g>
            );
          })
        )}

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

      <WallSlotOverlays gs={gs} onWallDrop={onWallDrop} svgSize={svgSize} />
    </div>
  );
}

function HWallSlot({ gs, row, col, onWallDrop }) {
  const { x, y } = cellPos(row, col);
  const valid = canPlaceWall(gs, row, col, 'h');

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPES.WALL,
    drop: () => onWallDrop(row, col, 'h'),
    canDrop: () => valid,
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  });

  const wy = y + CELL - 2;
  const slotH = WALL_W + 6;
  const slotW = CELL * 2 + 2;

  return (
    <div ref={drop} style={{
      position: 'absolute', left: x, top: wy - 3, width: slotW, height: slotH,
      background: isOver && canDrop ? 'rgba(255,224,102,0.75)' : isOver && !canDrop ? 'rgba(255,60,60,0.4)' : 'rgba(255,224,102,0.08)',
      border: `1px solid ${isOver && canDrop ? '#ffe066' : isOver ? '#f55' : 'rgba(255,224,102,0.2)'}`,
      borderRadius: 2, pointerEvents: valid ? 'auto' : 'none',
      cursor: isOver && canDrop ? 'copy' : 'default', transition: 'background 0.1s', boxSizing: 'border-box',
    }} />
  );
}

function VWallSlot({ gs, row, col, onWallDrop }) {
  const { x, y } = cellPos(row, col);
  const valid = canPlaceWall(gs, row, col, 'v');

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ITEM_TYPES.WALL,
    drop: () => onWallDrop(row, col, 'v'),
    canDrop: () => valid,
    collect: (monitor) => ({ isOver: monitor.isOver(), canDrop: monitor.canDrop() }),
  });

  const wx = x + CELL - 2;
  const slotW = WALL_W + 6;
  const slotH = CELL * 2 + 2;

  return (
    <div ref={drop} style={{
      position: 'absolute', left: wx - 3, top: y, width: slotW, height: slotH,
      background: isOver && canDrop ? 'rgba(255,224,102,0.75)' : isOver && !canDrop ? 'rgba(255,60,60,0.4)' : 'rgba(255,224,102,0.08)',
      border: `1px solid ${isOver && canDrop ? '#ffe066' : isOver ? '#f55' : 'rgba(255,224,102,0.2)'}`,
      borderRadius: 2, pointerEvents: valid ? 'auto' : 'none',
      cursor: isOver && canDrop ? 'copy' : 'default', transition: 'background 0.1s', boxSizing: 'border-box',
    }} />
  );
}

function WallSlotOverlays({ gs, onWallDrop, svgSize }) {
  const { currentPlayer, winner, wallsLeft, vsAI, aiPlayer } = gs;
  const hidden = !!winner;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: svgSize, height: svgSize, pointerEvents: 'none', opacity: hidden ? 0 : 1, transition: 'opacity 0.15s' }}>
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
function StartScreen({ onStart, onBack }) {
  const [vsAI, setVsAI] = useState(true);
  const [difficulty, setDifficulty] = useState('medium');
  return (
    <div className="start-screen" style={{ textAlign: 'center' }}>
      <h1>WALLS</h1>
      <p className="start-desc">Reach the opposite side first</p>
      <p className="start-rule">
        <span style={{ color: P1_COLOR }}>Red (P1)</span> starts at top, reaches bottom row.<br />
        <span style={{ color: P2_COLOR }}>Blue (P2)</span> starts at bottom, reaches top row.<br />
        Each player has {SIZE === 9 ? 10 : 5} walls to place.
      </p>
      <div style={{ marginBottom: 16 }}>
        <label className="start-checkbox">
          <input type="checkbox" checked={vsAI} onChange={e => setVsAI(e.target.checked)} style={{ marginRight: 8 }} />
          Play vs AI
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
          <button onClick={onBack} className="diff-btn">← Home</button>
        </div>
      )}
    </div>
  );
}

// ── Main app ──────────────────────────────────────────────────────────────────
function GameUI({ onBack, onResult }) {
  const [gs, setGs] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const resultReported = useRef(false);

  const handleStart = useCallback((opts) => {
    setGs(initState(opts));
    resultReported.current = false;
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

  // Report result once
  useEffect(() => {
    if (!gs?.winner || resultReported.current) return;
    resultReported.current = true;
    if (onResult) {
      onResult({
        gameId: 'walls',
        gameName: 'Walls',
        won: gs.winner === 'p2',
        moves: gs.moveCount || 0,
        difficulty: gs.difficulty || 'medium',
      });
    }
  }, [gs?.winner, onResult]);

  if (!gs) {
    return (
      <div className="game-walls" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <StartScreen onStart={handleStart} onBack={onBack} />
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
    <div className="game-walls" style={{ padding: '16px 12px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div className="status-bar" style={{ color: winner ? '#ffe066' : cpColor }}>
          {statusMsg}
        </div>

        <div className="hint-text" style={{ visibility: hint ? 'visible' : 'hidden' }}>
          {hint || 'Click a yellow cell to move, or drag a wall token onto the board'}
        </div>

        <Board gs={gs} onCellClick={handleCellClick} onWallDrop={handleWallDrop} isPlayerTurn={isPlayerTurn} />

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <WallSupply player="p1" wallsLeft={wallsLeft} isCurrentPlayer={currentPlayer === 'p1' && !winner} />
          <WallSupply player="p2" wallsLeft={wallsLeft} isCurrentPlayer={currentPlayer === 'p2' && !winner} />
        </div>

        {/* Winner overlay */}
        {winner && (
          <div className="winner-overlay">
            <div className="winner-banner">
              <div className="winner-label">{winner === 'p2' ? 'YOU WIN!' : 'AI WINS!'}</div>
              <div className="winner-reason">{winner === 'p1' ? 'Red' : 'Blue'} reached the opposite row</div>
              <button className="ctrl-btn" style={{ background: '#9942f0', color: '#fff', border: 'none', padding: '10px 24px' }} onClick={() => { setGs(null); }}>New Game</button>
              {onBack && <button className="ctrl-btn" style={{ marginTop: 8 }} onClick={onBack}>← Home</button>}
            </div>
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
            <button onClick={() => { setGs(null); setMenuOpen(false); }}>New Game</button>
            {onBack && <button onClick={onBack}>Back to Library</button>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function App({ onBack, onResult }) {
  return <GameUI onBack={onBack} onResult={onResult} />;
}

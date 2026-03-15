import React, { useState, useCallback, useEffect } from 'react';
import './App.css';
import { SIZE, initState, applyMove, applySwap, inBounds } from './Game';
import { getAIMove } from './AI/ai';

// ─── Board geometry ───────────────────────────────────────────────────────────
const HEX_SIZE = 26;                        // hex radius (center to vertex)
const HEX_W = Math.sqrt(3) * HEX_SIZE;     // horizontal center-to-center (~45.0)
const HEX_H_STEP = 1.5 * HEX_SIZE;         // vertical center-to-center (=39)
const PAD = 60;                             // padding around the board

function hexCenter(row, col) {
  const x = PAD + col * HEX_W + row * HEX_W * 0.5;
  const y = PAD + row * HEX_H_STEP;
  return { x, y };
}

function hexPoints(cx, cy) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i + 30); // pointy-top: first vertex at top
    pts.push(`${cx + HEX_SIZE * Math.cos(a)},${cy + HEX_SIZE * Math.sin(a)}`);
  }
  return pts.join(' ');
}

// SVG viewport size
const SVG_W = PAD * 2 + (SIZE - 1) * HEX_W + (SIZE - 1) * HEX_W * 0.5 + HEX_SIZE * 1.5;
const SVG_H = PAD * 2 + (SIZE - 1) * HEX_H_STEP + HEX_SIZE * 2;

// ─── Color constants ──────────────────────────────────────────────────────────
const COLORS = {
  red:   { fill: '#d94f4f', stroke: '#8b1a1a', label: 'Red' },
  blue:  { fill: '#4f7fd9', stroke: '#1a3d8b', label: 'Blue' },
  empty: { fill: '#3d6b45', stroke: '#2a4f30' },
};
const BG = '#1a2e1c';

// ─── Edge highlight strips ────────────────────────────────────────────────────
// Red lines along top/bottom edges; Blue lines along left/right edges.
// Lines connect the centers of the corner cells, offset slightly beyond the board.
const EDGE_OFFSET = 18; // pixels beyond the hex center to push the strip line

function EdgeStrips() {
  // Gather key corner centers
  const topLeft     = hexCenter(0, 0);
  const topRight    = hexCenter(0, SIZE - 1);
  const botLeft     = hexCenter(SIZE - 1, 0);
  const botRight    = hexCenter(SIZE - 1, SIZE - 1);

  // Red: top edge (row 0) — line above the first row
  // Offset upward (negative y direction for pointy-top hexes)
  const redTopY   = topLeft.y - EDGE_OFFSET;
  const redBotY   = botLeft.y + EDGE_OFFSET;

  // Blue: left edge (col 0) — line to the upper-left of col 0
  // For the rhombus layout the left edge runs from topLeft diagonally down to botLeft
  // Offset perpendicular to the left edge direction.
  // Left edge direction vector (botLeft - topLeft), perpendicular offset to the left.
  const leftDx = botLeft.x - topLeft.x;
  const leftDy = botLeft.y - topLeft.y;
  const leftLen = Math.sqrt(leftDx * leftDx + leftDy * leftDy);
  const leftNx = -leftDy / leftLen; // left-pointing normal
  const leftNy =  leftDx / leftLen;

  const rightDx = botRight.x - topRight.x;
  const rightDy = botRight.y - topRight.y;
  const rightLen = Math.sqrt(rightDx * rightDx + rightDy * rightDy);
  const rightNx =  rightDy / rightLen; // right-pointing normal
  const rightNy = -rightDx / rightLen;

  return (
    <>
      {/* Red: top edge */}
      <line
        x1={topLeft.x} y1={redTopY}
        x2={topRight.x} y2={redTopY}
        stroke="#e05555" strokeWidth={8} strokeLinecap="round"
      />
      {/* Red: bottom edge */}
      <line
        x1={botLeft.x} y1={redBotY}
        x2={botRight.x} y2={redBotY}
        stroke="#e05555" strokeWidth={8} strokeLinecap="round"
      />
      {/* Blue: left edge */}
      <line
        x1={topLeft.x  + leftNx * EDGE_OFFSET} y1={topLeft.y  + leftNy * EDGE_OFFSET}
        x2={botLeft.x  + leftNx * EDGE_OFFSET} y2={botLeft.y  + leftNy * EDGE_OFFSET}
        stroke="#5588e0" strokeWidth={8} strokeLinecap="round"
      />
      {/* Blue: right edge */}
      <line
        x1={topRight.x + rightNx * EDGE_OFFSET} y1={topRight.y + rightNy * EDGE_OFFSET}
        x2={botRight.x + rightNx * EDGE_OFFSET} y2={botRight.y + rightNy * EDGE_OFFSET}
        stroke="#5588e0" strokeWidth={8} strokeLinecap="round"
      />
    </>
  );
}

// ─── Board cell ───────────────────────────────────────────────────────────────
function HexCell({ row, col, owner, onClick }) {
  const { x, y } = hexCenter(row, col);
  const pts = hexPoints(x, y);
  const c = owner ? COLORS[owner] : COLORS.empty;
  return (
    <polygon
      points={pts}
      fill={c.fill}
      stroke={c.stroke}
      strokeWidth={owner ? 2 : 1.5}
      style={{ cursor: owner ? 'default' : 'pointer', transition: 'fill 0.1s' }}
      onClick={owner ? undefined : onClick}
    />
  );
}

// ─── Start screen ─────────────────────────────────────────────────────────────
function StartScreen({ onStart }) {
  const [vsAI, setVsAI] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');

  return (
    <div style={{ textAlign: 'center', padding: 40, maxWidth: 440, margin: '0 auto' }}>
      <h1 style={{ color: '#cde8cf', marginBottom: 8 }}>HEX</h1>
      <p style={{ color: '#8aad8c', marginBottom: 6 }}>Connect your edges to win</p>
      <div style={{ color: '#6aab6e', fontSize: 13, marginBottom: 24 }}>
        <span style={{ color: '#d94f4f' }}>Red</span> connects top↔bottom &nbsp;|&nbsp;
        <span style={{ color: '#4f7fd9' }}>Blue</span> connects left↔right
      </div>

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
              style={{ margin: '0 4px', padding: '4px 12px', background: difficulty === d ? '#4a7c59' : '#1a2e1c', color: '#cde8cf', border: '1px solid #4a7c59', borderRadius: 4, cursor: 'pointer' }}>
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

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [gameState, setGameState] = useState(null);

  const handleStart = useCallback((opts) => {
    setGameState(initState(opts));
  }, []);

  const handleCellClick = useCallback((row, col) => {
    if (!gameState || gameState.winner) return;
    // Don't allow clicking if it's AI's turn
    if (gameState.vsAI && gameState.currentPlayer === gameState.aiPlayer) return;
    setGameState(s => applyMove(s, row, col));
  }, [gameState]);

  const handleSwap = useCallback(() => {
    if (!gameState || gameState.winner) return;
    if (gameState.vsAI && gameState.currentPlayer === gameState.aiPlayer) return;
    setGameState(s => applySwap(s));
  }, [gameState]);

  // AI turn
  useEffect(() => {
    if (!gameState || gameState.winner) return;
    if (!gameState.vsAI || gameState.currentPlayer !== gameState.aiPlayer) return;

    const timer = setTimeout(() => {
      const move = getAIMove(gameState, gameState.aiPlayer, gameState.difficulty);
      if (!move) return;
      setGameState(s => applyMove(s, move[0], move[1]));
    }, 250);
    return () => clearTimeout(timer);
  }, [gameState]);

  if (!gameState) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <StartScreen onStart={handleStart} />
      </div>
    );
  }

  const { board, currentPlayer, winner, vsAI, aiPlayer, moveCount } = gameState;
  const statusMsg = winner
    ? `${COLORS[winner].label.toUpperCase()} WINS!`
    : vsAI && currentPlayer === aiPlayer
    ? 'AI is thinking...'
    : `${COLORS[currentPlayer].label}'s turn`;

  // Swap rule: offer to blue (second player) only on their first turn (moveCount === 1)
  const canSwap = !winner && moveCount === 1 && currentPlayer === 'blue'
    && !(vsAI && aiPlayer === 'blue');

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* Status bar */}
        <div style={{ color: winner ? COLORS[winner].fill : COLORS[currentPlayer].fill, fontSize: 20, fontWeight: 'bold' }}>
          {statusMsg}
        </div>

        {/* Swap rule button — offered to blue on move 2 only */}
        {canSwap && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ color: '#8aad8c', fontSize: 12 }}>
              Blue may invoke the swap rule instead of placing:
            </div>
            <button onClick={handleSwap}
              style={{ padding: '6px 18px', background: '#4f7fd9', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
              Swap (take Red's stone)
            </button>
          </div>
        )}

        {/* Board */}
        <svg width={SVG_W} height={SVG_H} style={{ display: 'block' }}>
          <EdgeStrips />
          {board.map((rowArr, r) =>
            rowArr.map((cell, c) => (
              <HexCell key={`${r},${c}`} row={r} col={c} owner={cell}
                onClick={() => handleCellClick(r, c)} />
            ))
          )}
        </svg>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 24, color: '#8aad8c', fontSize: 13 }}>
          <span><span style={{ color: '#d94f4f' }}>■</span> Red: top → bottom</span>
          <span><span style={{ color: '#4f7fd9' }}>■</span> Blue: left → right</span>
        </div>

        <button onClick={() => setGameState(null)}
          style={{ padding: '8px 20px', background: '#4a7c59', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          New Game
        </button>
      </div>
    </div>
  );
}

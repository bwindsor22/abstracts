import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import WinOverlay from '../../components/WinOverlay';
import { SIZE, initState, applyMove, applySwap } from './Game';
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
  empty: { fill: '#2a1f45', stroke: '#3d2a5a' },
};
const BG = '#191022';

// ─── Edge highlight strips ────────────────────────────────────────────────────
const EDGE_OFFSET = 18;

function EdgeStrips() {
  const topLeft     = hexCenter(0, 0);
  const topRight    = hexCenter(0, SIZE - 1);
  const botLeft     = hexCenter(SIZE - 1, 0);
  const botRight    = hexCenter(SIZE - 1, SIZE - 1);

  const redTopY   = topLeft.y - EDGE_OFFSET;
  const redBotY   = botLeft.y + EDGE_OFFSET;

  const leftDx = botLeft.x - topLeft.x;
  const leftDy = botLeft.y - topLeft.y;
  const leftLen = Math.sqrt(leftDx * leftDx + leftDy * leftDy);
  const leftNx = -leftDy / leftLen;
  const leftNy =  leftDx / leftLen;

  const rightDx = botRight.x - topRight.x;
  const rightDy = botRight.y - topRight.y;
  const rightLen = Math.sqrt(rightDx * rightDx + rightDy * rightDy);
  const rightNx =  rightDy / rightLen;
  const rightNy = -rightDx / rightLen;

  return (
    <>
      <line x1={topLeft.x} y1={redTopY} x2={topRight.x} y2={redTopY}
        stroke="#e05555" strokeWidth={8} strokeLinecap="round" />
      <line x1={botLeft.x} y1={redBotY} x2={botRight.x} y2={redBotY}
        stroke="#e05555" strokeWidth={8} strokeLinecap="round" />
      <line
        x1={topLeft.x  + leftNx * EDGE_OFFSET} y1={topLeft.y  + leftNy * EDGE_OFFSET}
        x2={botLeft.x  + leftNx * EDGE_OFFSET} y2={botLeft.y  + leftNy * EDGE_OFFSET}
        stroke="#5588e0" strokeWidth={8} strokeLinecap="round" />
      <line
        x1={topRight.x + rightNx * EDGE_OFFSET} y1={topRight.y + rightNy * EDGE_OFFSET}
        x2={botRight.x + rightNx * EDGE_OFFSET} y2={botRight.y + rightNy * EDGE_OFFSET}
        stroke="#5588e0" strokeWidth={8} strokeLinecap="round" />
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
function StartScreen({ onStart, onBack }) {
  const [vsAI, setVsAI] = useState(true);
  const [difficulty, setDifficulty] = useState('medium');

  return (
    <div className="start-screen" style={{ textAlign: 'center' }}>
      <h1>HEXES</h1>
      <p className="start-desc">Connect your edges to win</p>
      <div className="start-rule">
        <span style={{ color: '#d94f4f' }}>Red</span> connects top↔bottom &nbsp;|&nbsp;
        <span style={{ color: '#4f7fd9' }}>Blue</span> connects left↔right
      </div>

      <div style={{ marginBottom: 16 }}>
        <label className="start-checkbox">
          <input type="checkbox" checked={vsAI} onChange={e => setVsAI(e.target.checked)} style={{ marginRight: 8 }} />
          Play vs AI (Blue)
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

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App({ onBack, onResult }) {
  const [gameState, setGameState] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const resultReported = useRef(false);

  const handleStart = useCallback((opts) => {
    setGameState(initState(opts));
    resultReported.current = false;
  }, []);

  const handleCellClick = useCallback((row, col) => {
    if (!gameState || gameState.winner) return;
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

  // Report result once when winner is set
  useEffect(() => {
    if (!gameState?.winner || resultReported.current) return;
    resultReported.current = true;
    if (onResult) {
      onResult({
        gameId: 'hexes',
        gameName: 'Hexes',
        won: gameState.winner === 'red',
        moves: gameState.moveCount || 0,
        difficulty: gameState.difficulty || 'medium',
      });
    }
  }, [gameState?.winner, onResult]);

  if (!gameState) {
    return (
      <div className="game-hexes" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <StartScreen onStart={handleStart} onBack={onBack} />
      </div>
    );
  }

  const { board, currentPlayer, winner, vsAI, aiPlayer, moveCount } = gameState;
  const statusMsg = winner
    ? `${COLORS[winner].label.toUpperCase()} WINS!`
    : vsAI && currentPlayer === aiPlayer
    ? 'AI is thinking...'
    : `${COLORS[currentPlayer].label}'s turn`;

  const canSwap = !winner && moveCount === 1 && currentPlayer === 'blue'
    && !(vsAI && aiPlayer === 'blue');

  return (
    <div className="game-hexes" style={{ padding: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        {/* Status bar */}
        <div className="status-bar" style={{ color: winner ? COLORS[winner].fill : COLORS[currentPlayer].fill }}>
          {statusMsg}
        </div>

        {/* Swap rule */}
        {canSwap && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div className="swap-hint">Blue may invoke the swap rule instead of placing:</div>
            <button onClick={handleSwap} className="swap-btn">
              Swap (take Red's stone)
            </button>
          </div>
        )}

        {/* Board */}
        <svg width={SVG_W} height={SVG_H} style={{ display: 'block', background: BG }}>
          <EdgeStrips />
          {board.map((rowArr, r) =>
            rowArr.map((cell, c) => (
              <HexCell key={`${r},${c}`} row={r} col={c} owner={cell}
                onClick={() => handleCellClick(r, c)} />
            ))
          )}
        </svg>

        {/* Legend */}
        <div className="legend">
          <span><span style={{ color: '#d94f4f' }}>■</span> Red: top → bottom</span>
          <span><span style={{ color: '#4f7fd9' }}>■</span> Blue: left → right</span>
        </div>

        {/* Bottom controls */}
        <div className="game-controls">
          <button className="ctrl-btn" disabled>UNDO</button>
          <button className="ctrl-btn" onClick={() => setMenuOpen(true)}>MENU</button>
        </div>
      </div>

      {/* Win overlay */}
      {winner && (
        <WinOverlay
          title={vsAI ? (winner !== aiPlayer ? 'YOU WIN!' : 'AI WINS!') : `${COLORS[winner].label} wins!`}
          subtitle="Connected both sides"
          onNewGame={() => { setGameState(null); }}
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

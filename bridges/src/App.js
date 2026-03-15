import React, { useState, useCallback, useEffect } from 'react';
import './App.css';
import { SIZE, initState, applyMove, applySwap, removePeg, removeLink, canPlace } from './Game';
import { getAIMove } from './AI/ai';

const CELL = 26;    // px per grid cell
const PAD = 36;
const DOT = 6;      // peg radius
const BAND = 12;    // border band thickness

const BG = '#0d1b2a';
const RED_COLOR = '#e05555';
const BLUE_COLOR = '#5588e0';

function cellPos(r, c) {
  return { x: PAD + c * CELL, y: PAD + r * CELL };
}

function StartScreen({ onStart }) {
  const [vsAI, setVsAI] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  return (
    <div style={{ textAlign: 'center', padding: 40, maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ color: '#c8d8f0', marginBottom: 8 }}>TWIXT</h1>
      <p style={{ color: '#8aa0c0', marginBottom: 6 }}>Connect your two sides with peg links</p>
      <p style={{ color: '#6a80a0', fontSize: 13, marginBottom: 24 }}>
        <span style={{ color: RED_COLOR }}>Red</span> connects top ↕ bottom.<br />
        <span style={{ color: BLUE_COLOR }}>Blue</span> connects left ↔ right.<br />
        Pegs auto-link with knight moves. Links cannot cross opponent links.<br />
        Before placing, you may remove your own pegs/links.
      </p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ color: '#c8d8f0' }}>
          <input type="checkbox" checked={vsAI} onChange={e => setVsAI(e.target.checked)} style={{ marginRight: 8 }} />
          Play vs AI (Blue)
        </label>
      </div>
      {vsAI && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#8aa0c0', marginRight: 8 }}>Difficulty:</label>
          {['easy', 'medium', 'hard'].map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              style={{ margin: '0 4px', padding: '4px 12px', background: difficulty === d ? '#2a4a7a' : BG, color: '#c8d8f0', border: '1px solid #2a4a7a', borderRadius: 4, cursor: 'pointer' }}>
              {d}
            </button>
          ))}
        </div>
      )}
      <button onClick={() => onStart({ vsAI, difficulty })}
        style={{ padding: '12px 32px', background: '#2a4a7a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>
        Start Game
      </button>
    </div>
  );
}

export default function App() {
  const [gs, setGs] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [removeMode, setRemoveMode] = useState(false);

  const handleStart = useCallback((opts) => {
    setGs(initState({ ...opts, aiPlayer: 'blue' }));
    setHoverCell(null);
    setRemoveMode(false);
  }, []);

  const handleClick = useCallback((r, c) => {
    if (!gs || gs.winner) return;
    if (gs.vsAI && gs.currentPlayer === gs.aiPlayer) return;

    if (removeMode) {
      // Remove own peg (and its links) if clicked
      if (gs.board[`${r},${c}`] === gs.currentPlayer) {
        setGs(s => removePeg(s, r, c));
      }
      return;
    }

    if (!canPlace(gs.currentPlayer, r, c)) return;
    if (gs.board[`${r},${c}`]) return;
    setGs(s => applyMove(s, r, c));
    setRemoveMode(false);
  }, [gs, removeMode]);

  const handleLinkClick = useCallback((r1, c1, r2, c2) => {
    if (!gs || gs.winner) return;
    if (gs.vsAI && gs.currentPlayer === gs.aiPlayer) return;
    if (!removeMode) return;
    setGs(s => removeLink(s, r1, c1, r2, c2));
  }, [gs, removeMode]);

  const handleSwap = useCallback(() => {
    if (!gs || gs.winner) return;
    if (gs.vsAI && gs.currentPlayer === gs.aiPlayer) return;
    setGs(s => applySwap(s));
  }, [gs]);

  // AI turn
  useEffect(() => {
    if (!gs || gs.winner) return;
    if (!gs.vsAI || gs.currentPlayer !== gs.aiPlayer) return;
    const timer = setTimeout(() => {
      const move = getAIMove(gs, gs.aiPlayer, gs.difficulty);
      if (move) setGs(s => applyMove(s, move[0], move[1]));
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

  const { board, links, currentPlayer, winner, vsAI, aiPlayer, moveCount } = gs;
  const svgSize = PAD * 2 + (SIZE - 1) * CELL;
  const isHumanTurn = !winner && !(vsAI && currentPlayer === aiPlayer);
  const cpColor = currentPlayer === 'red' ? RED_COLOR : BLUE_COLOR;

  const statusMsg = winner
    ? `${winner.toUpperCase()} WINS!`
    : vsAI && currentPlayer === aiPlayer
    ? 'AI thinking...'
    : removeMode
    ? `${currentPlayer.toUpperCase()}: click own pegs/links to remove, then place`
    : `${currentPlayer.toUpperCase()}'s turn`;

  // Pi rule: offer swap to blue on their first turn (after red placed exactly one peg)
  const canSwap = !winner && moveCount === 1 && currentPlayer === 'blue'
    && !(vsAI && aiPlayer === 'blue');

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ color: winner ? '#ffe066' : removeMode ? '#ffaa44' : cpColor, fontSize: 18, fontWeight: 'bold' }}>{statusMsg}</div>

        {/* Pi rule (swap) button */}
        {canSwap && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ color: '#8aa0c0', fontSize: 12 }}>
              Blue may invoke the Pi rule instead of placing:
            </div>
            <button onClick={handleSwap}
              style={{ padding: '6px 18px', background: BLUE_COLOR, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
              Swap (take Red's peg)
            </button>
          </div>
        )}

        {/* Remove mode toggle — only available during human turn */}
        {isHumanTurn && !canSwap && (
          <button onClick={() => setRemoveMode(m => !m)}
            style={{ padding: '4px 14px', background: removeMode ? '#7a3a1a' : '#2a3a5a', color: removeMode ? '#ffaa44' : '#8aa0c0', border: `1px solid ${removeMode ? '#ffaa44' : '#2a3a5a'}`, borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            {removeMode ? 'Removing — click a cell to place' : 'Remove pegs/links'}
          </button>
        )}

        <svg width={svgSize} height={svgSize}
          style={{ background: '#1a2a3e', borderRadius: 4, border: '1px solid #2a3a5a', display: 'block' }}>

          {/* Tinted goal strips at edge rows/cols */}
          {Array.from({ length: SIZE - 2 }, (_, i) => {
            const col = i + 1;
            const { x, y } = cellPos(0, col);
            return <rect key={`rt-strip-${i}`} x={x - CELL / 2} y={y - CELL / 2} width={CELL} height={CELL} fill={RED_COLOR} opacity={0.12} />;
          })}
          {Array.from({ length: SIZE - 2 }, (_, i) => {
            const col = i + 1;
            const { x, y } = cellPos(SIZE - 1, col);
            return <rect key={`rb-strip-${i}`} x={x - CELL / 2} y={y - CELL / 2} width={CELL} height={CELL} fill={RED_COLOR} opacity={0.12} />;
          })}
          {Array.from({ length: SIZE - 2 }, (_, i) => {
            const row = i + 1;
            const { x, y } = cellPos(row, 0);
            return <rect key={`bl-strip-${i}`} x={x - CELL / 2} y={y - CELL / 2} width={CELL} height={CELL} fill={BLUE_COLOR} opacity={0.12} />;
          })}
          {Array.from({ length: SIZE - 2 }, (_, i) => {
            const row = i + 1;
            const { x, y } = cellPos(row, SIZE - 1);
            return <rect key={`br-strip-${i}`} x={x - CELL / 2} y={y - CELL / 2} width={CELL} height={CELL} fill={BLUE_COLOR} opacity={0.12} />;
          })}

          {/* Border bands */}
          <rect x={PAD} y={PAD - BAND - 4} width={(SIZE - 1) * CELL} height={BAND} fill={RED_COLOR} rx={3} />
          <text x={PAD + (SIZE - 1) * CELL / 2} y={PAD - 4 - BAND / 2} textAnchor="middle" dominantBaseline="middle"
            fill="#fff" fontSize={9} fontWeight="bold" fontFamily="sans-serif">RED ↕</text>
          <rect x={PAD} y={PAD + (SIZE - 1) * CELL + 4} width={(SIZE - 1) * CELL} height={BAND} fill={RED_COLOR} rx={3} />
          <text x={PAD + (SIZE - 1) * CELL / 2} y={PAD + (SIZE - 1) * CELL + 4 + BAND / 2} textAnchor="middle" dominantBaseline="middle"
            fill="#fff" fontSize={9} fontWeight="bold" fontFamily="sans-serif">RED ↕</text>
          <rect x={PAD - BAND - 4} y={PAD} width={BAND} height={(SIZE - 1) * CELL} fill={BLUE_COLOR} rx={3} />
          <text x={PAD - 4 - BAND / 2} y={PAD + (SIZE - 1) * CELL / 2} textAnchor="middle" dominantBaseline="middle"
            fill="#fff" fontSize={9} fontWeight="bold" fontFamily="sans-serif"
            transform={`rotate(-90, ${PAD - 4 - BAND / 2}, ${PAD + (SIZE - 1) * CELL / 2})`}>BLUE ↔</text>
          <rect x={PAD + (SIZE - 1) * CELL + 4} y={PAD} width={BAND} height={(SIZE - 1) * CELL} fill={BLUE_COLOR} rx={3} />
          <text x={PAD + (SIZE - 1) * CELL + 4 + BAND / 2} y={PAD + (SIZE - 1) * CELL / 2} textAnchor="middle" dominantBaseline="middle"
            fill="#fff" fontSize={9} fontWeight="bold" fontFamily="sans-serif"
            transform={`rotate(90, ${PAD + (SIZE - 1) * CELL + 4 + BAND / 2}, ${PAD + (SIZE - 1) * CELL / 2})`}>BLUE ↔</text>

          {/* Links — clickable in remove mode if own link */}
          {links.map((lk, i) => {
            const p1 = cellPos(lk.r1, lk.c1);
            const p2 = cellPos(lk.r2, lk.c2);
            const isOwnLink = removeMode && isHumanTurn && lk.player === currentPlayer;
            return (
              <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke={lk.player === 'red' ? RED_COLOR : BLUE_COLOR}
                strokeWidth={isOwnLink ? 4 : 2}
                opacity={isOwnLink ? 1 : 0.8}
                style={{ cursor: isOwnLink ? 'pointer' : 'default' }}
                onClick={() => isOwnLink && handleLinkClick(lk.r1, lk.c1, lk.r2, lk.c2)}
              />
            );
          })}

          {/* Grid dots */}
          {Array.from({ length: SIZE }, (_, r) =>
            Array.from({ length: SIZE }, (_, c) => {
              const { x, y } = cellPos(r, c);
              const isCorner = (r === 0 || r === SIZE - 1) && (c === 0 || c === SIZE - 1);
              if (isCorner) return null;
              const placed = board[`${r},${c}`];
              const isOwnPeg = removeMode && isHumanTurn && placed === currentPlayer;
              const placeable = !removeMode && canPlace(currentPlayer, r, c) && !placed;
              const isHover = hoverCell?.r === r && hoverCell?.c === c;
              return (
                <circle key={`${r},${c}`} cx={x} cy={y}
                  r={placed ? DOT : isHover && placeable ? DOT - 1 : 2}
                  fill={
                    placed === 'red' ? RED_COLOR :
                    placed === 'blue' ? BLUE_COLOR :
                    isHover && placeable ? (currentPlayer === 'red' ? RED_COLOR : BLUE_COLOR) :
                    '#3a4a6a'
                  }
                  stroke={isOwnPeg ? '#ffaa44' : 'none'}
                  strokeWidth={isOwnPeg ? 2 : 0}
                  opacity={placed ? 1 : isHover ? 0.7 : 1}
                  style={{ cursor: (placeable || isOwnPeg) ? 'pointer' : 'default' }}
                  onMouseEnter={() => setHoverCell({ r, c })}
                  onMouseLeave={() => setHoverCell(null)}
                  onClick={() => handleClick(r, c)}
                />
              );
            })
          )}
        </svg>

        <button onClick={() => setGs(null)}
          style={{ padding: '8px 20px', background: '#2a4a7a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          New Game
        </button>
      </div>
    </div>
  );
}

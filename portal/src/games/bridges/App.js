import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import WinOverlay from '../../components/WinOverlay';
import { SIZE, initState, applyMove, applySwap, removePeg, removeLink, canPlace } from './Game';
import { getAIMove } from './AI/ai';

const CELL = 26;    // px per grid cell
const PAD = 36;
const DOT = 6;      // peg radius
const BAND = 12;    // border band thickness

const BG = '#191022';
const SVG_BG = '#1a1030';
const RED_COLOR = '#e05555';
const BLUE_COLOR = '#5588e0';

function cellPos(r, c) {
  return { x: PAD + c * CELL, y: PAD + r * CELL };
}

function StartScreen({ onStart, onBack }) {
  const [vsAI, setVsAI] = useState(true);
  const [difficulty, setDifficulty] = useState('medium');
  return (
    <div className="start-screen" style={{ textAlign: 'center' }}>
      <h1>BRIDGES</h1>
      <p className="start-desc">Connect your two sides with peg links</p>
      <p className="start-rule">
        <span style={{ color: RED_COLOR }}>Red</span> connects top ↕ bottom.<br />
        <span style={{ color: BLUE_COLOR }}>Blue</span> connects left ↔ right.<br />
        Pegs auto-link with knight moves. Links cannot cross opponent links.<br />
        Before placing, you may remove your own pegs/links.
      </p>
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

export default function App({ onBack, onResult }) {
  const [gs, setGs] = useState(null);
  const [hoverCell, setHoverCell] = useState(null);
  const [removeMode, setRemoveMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const resultReported = useRef(false);

  const handleStart = useCallback((opts) => {
    setGs(initState({ ...opts, aiPlayer: 'blue' }));
    setHoverCell(null);
    setRemoveMode(false);
    resultReported.current = false;
  }, []);

  const handleClick = useCallback((r, c) => {
    if (!gs || gs.winner) return;
    if (gs.vsAI && gs.currentPlayer === gs.aiPlayer) return;

    if (removeMode) {
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

  // Report result once
  useEffect(() => {
    if (!gs?.winner || resultReported.current) return;
    resultReported.current = true;
    if (onResult) {
      onResult({
        gameId: 'bridges',
        gameName: 'Bridges',
        won: gs.winner === 'red',
        moves: gs.moveCount || 0,
        difficulty: gs.difficulty || 'medium',
      });
    }
  }, [gs?.winner, onResult]);

  if (!gs) {
    return (
      <div className="game-bridges" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <StartScreen onStart={handleStart} onBack={onBack} />
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

  const canSwap = !winner && moveCount === 1 && currentPlayer === 'blue'
    && !(vsAI && aiPlayer === 'blue');

  return (
    <div className="game-bridges" style={{ padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div className="status-bar" style={{ color: winner ? '#ffe066' : removeMode ? '#ffaa44' : cpColor }}>
          {statusMsg}
        </div>

        {/* Pi rule (swap) button */}
        {canSwap && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div className="swap-hint">Blue may invoke the Pi rule instead of placing:</div>
            <button onClick={handleSwap}
              style={{ padding: '6px 18px', background: BLUE_COLOR, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'Space Grotesk, sans-serif' }}>
              Swap (take Red's peg)
            </button>
          </div>
        )}

        <svg width={svgSize} height={svgSize}
          style={{ background: SVG_BG, borderRadius: 4, border: '1px solid rgba(153,66,240,0.2)', display: 'block' }}>

          {/* Tinted goal strips */}
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

          {/* Links */}
          {links.map((lk, i) => {
            const p1 = cellPos(lk.r1, lk.c1);
            const p2 = cellPos(lk.r2, lk.c2);
            const isOwnLink = removeMode && isHumanTurn && lk.player === currentPlayer;
            const linkColor = lk.player === 'red' ? RED_COLOR : BLUE_COLOR;
            return (
              <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                stroke={linkColor}
                strokeWidth={isOwnLink ? 4 : 2}
                opacity={isOwnLink ? 1 : 0.8}
                style={{
                  cursor: isOwnLink ? 'pointer' : 'default',
                  filter: `drop-shadow(0 0 2px ${linkColor})`,
                }}
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
              const pegColor = placed === 'red' ? RED_COLOR : placed === 'blue' ? BLUE_COLOR :
                isHover && placeable ? (currentPlayer === 'red' ? RED_COLOR : BLUE_COLOR) : '#3a3060';
              return (
                <g key={`${r},${c}`}>
                  {/* Invisible hit area for easier clicking */}
                  <circle cx={x} cy={y}
                    r={CELL / 2}
                    fill="transparent"
                    style={{ cursor: (placeable || isOwnPeg) ? 'pointer' : 'default' }}
                    onMouseEnter={() => setHoverCell({ r, c })}
                    onMouseLeave={() => setHoverCell(null)}
                    onClick={() => handleClick(r, c)}
                  />
                  {/* Visible dot */}
                  <circle cx={x} cy={y}
                    r={placed ? DOT : isHover && placeable ? DOT - 1 : 2}
                    fill={pegColor}
                    stroke={isOwnPeg ? '#ffaa44' : 'none'}
                    strokeWidth={isOwnPeg ? 2 : 0}
                    opacity={placed ? 1 : isHover ? 0.7 : 1}
                    style={{
                      pointerEvents: 'none',
                      filter: placed ? `drop-shadow(0 0 3px ${pegColor})` : 'none',
                    }}
                  />
                </g>
              );
            })
          )}
        </svg>

        {/* Bottom controls */}
        <div className="game-controls">
          <button className="ctrl-btn" disabled>UNDO</button>
          {isHumanTurn && !canSwap && (
            <button
              className={`ctrl-btn${removeMode ? ' active' : ''}`}
              onClick={() => setRemoveMode(m => !m)}
            >
              {removeMode ? 'REMOVING' : 'REMOVE'}
            </button>
          )}
          <button className="ctrl-btn" onClick={() => setMenuOpen(true)}>MENU</button>
        </div>
      </div>

      {/* Win overlay */}
      {winner && (
        <WinOverlay
          title={vsAI ? (winner !== aiPlayer ? 'YOU WIN!' : 'AI WINS!') : `${winner === 'red' ? 'Red' : 'Blue'} wins!`}
          subtitle="Connected both sides"
          onNewGame={() => setGs(null)}
          onHome={onBack}
        />
      )}

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

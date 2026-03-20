import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import WinOverlay from '../../components/WinOverlay';
import { SIZE, initState, applyMove } from './Game';
import { getAIMove } from './AI/ai';

const CELL = 30;
const PAD = 20;
const GRID_COLOR = 'rgba(153,66,240,0.15)';

const COLOR_PALETTE = [
  { value: '#222',    label: 'Black'  },
  { value: '#f5f5f0', label: 'Ivory'  },
  { value: '#e05555', label: 'Red'    },
  { value: '#5588e0', label: 'Blue'   },
  { value: '#22aa55', label: 'Green'  },
];

function strokeFor(fill) {
  if (fill === '#f5f5f0') return '#999';
  if (fill === '#222')    return '#555';
  return fill;
}

function cellPos(r, c) {
  return { x: PAD + c * CELL, y: PAD + r * CELL };
}

function ColorPicker({ label, selected, onChange, disabledColor }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className="color-picker-label">{label}</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
        {COLOR_PALETTE.map(c => (
          <button
            key={c.value}
            title={c.label}
            disabled={c.value === disabledColor}
            onClick={() => onChange(c.value)}
            style={{
              width: 28, height: 28,
              borderRadius: '50%',
              background: c.value,
              border: selected === c.value ? '3px solid #fff' : '2px solid #555',
              cursor: c.value === disabledColor ? 'not-allowed' : 'pointer',
              opacity: c.value === disabledColor ? 0.3 : 1,
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function StartScreen({ onStart, onBack }) {
  const [vsAI, setVsAI] = useState(true);
  const [difficulty, setDifficulty] = useState('medium');
  const [p1Color, setP1Color] = useState('#222');
  const [p2Color, setP2Color] = useState('#f5f5f0');

  return (
    <div className="start-screen" style={{ textAlign: 'center' }}>
      <h1>PAIRS</h1>
      <p className="start-desc">Five in a row, or capture 5 pairs</p>
      <p className="start-rule">
        Place stones on a 19×19 board. Win by 5-in-a-row OR 5 captured pairs.<br />
        Capture: your stone flanks two opponent stones in a row.
      </p>

      <ColorPicker
        label="Player 1 color (Black / goes first)"
        selected={p1Color}
        onChange={setP1Color}
        disabledColor={p2Color}
      />
      <ColorPicker
        label="Player 2 color (White)"
        selected={p2Color}
        onChange={setP2Color}
        disabledColor={p1Color}
      />

      <div style={{ marginBottom: 16 }}>
        <label className="start-checkbox">
          <input type="checkbox" checked={vsAI} onChange={e => setVsAI(e.target.checked)} style={{ marginRight: 8 }} />
          Play vs AI (Player 2)
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
      <button onClick={() => onStart({ vsAI, difficulty, p1Color, p2Color })} className="btn-primary">
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

function CaptureSidebar({ pairsCount, stoneColor, strokeColor, label, svgHeight }) {
  const stoneR = 10;
  const stoneD = stoneR * 2 + 4;
  const sidebarWidth = 48;
  const cx = sidebarWidth / 2;
  const totalStones = pairsCount * 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: sidebarWidth }}>
      <div style={{ color: 'rgba(240,238,255,0.45)', fontSize: 11, marginBottom: 4, textAlign: 'center', lineHeight: 1.2 }}>{label}</div>
      <svg width={sidebarWidth} height={svgHeight} style={{ display: 'block' }}>
        {Array.from({ length: totalStones }, (_, i) => {
          const cy = stoneR + 4 + i * stoneD;
          return (
            <circle key={i} cx={cx} cy={cy} r={stoneR}
              fill={stoneColor} stroke={strokeColor} strokeWidth={1.5} />
          );
        })}
      </svg>
    </div>
  );
}

export default function App({ onBack, onResult }) {
  const [gs, setGs] = useState(null);
  const [hover, setHover] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const resultReported = useRef(false);

  const handleStart = useCallback((opts) => {
    setGs(initState({ vsAI: opts.vsAI, aiPlayer: 'white', difficulty: opts.difficulty,
                      p1Color: opts.p1Color, p2Color: opts.p2Color }));
    setHover(null);
    resultReported.current = false;
  }, []);

  const handleClick = useCallback((r, c) => {
    if (!gs || gs.winner) return;
    if (gs.vsAI && gs.currentPlayer === gs.aiPlayer) return;
    if (gs.board[r][c]) return;
    setGs(s => applyMove(s, r, c));
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
        gameId: 'pairs',
        gameName: 'Pairs',
        won: gs.winner === 'black',
        moves: gs.moveCount || 0,
        difficulty: gs.difficulty || 'medium',
      });
    }
  }, [gs?.winner, onResult]);

  if (!gs) {
    return (
      <div className="game-stones" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <StartScreen onStart={handleStart} onBack={onBack} />
      </div>
    );
  }

  const { board, captures, currentPlayer, winner, vsAI, aiPlayer, p1Color, p2Color } = gs;
  const svgSize = PAD * 2 + (SIZE - 1) * CELL;
  const R = CELL * 0.43;

  const colorOf = (player) => player === 'black' ? p1Color : p2Color;
  const strokeOf = (player) => strokeFor(colorOf(player));

  const statusMsg = winner
    ? `${winner === 'black' ? 'Player 1' : 'Player 2'} WINS!`
    : vsAI && currentPlayer === aiPlayer
    ? 'AI thinking...'
    : `${currentPlayer === 'black' ? 'Player 1' : 'Player 2'}'s turn`;

  const sidebarHeight = svgSize;

  return (
    <div className="game-stones" style={{ padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div className="status-bar" style={{ color: winner ? '#ffe066' : 'rgba(240,238,255,0.85)' }}>{statusMsg}</div>

        <div className="captures-row">
          <span>P1 captures: {captures.black}/5</span>
          <span>P2 captures: {captures.white}/5</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <CaptureSidebar
            pairsCount={captures.black}
            stoneColor={p2Color}
            strokeColor={strokeFor(p2Color)}
            label={'P1\ncaps'}
            svgHeight={sidebarHeight}
          />

          <svg width={svgSize} height={svgSize}
            style={{ background: '#1a1030', borderRadius: 4, border: '1px solid rgba(153,66,240,0.2)', display: 'block' }}>

            {/* Grid lines */}
            {Array.from({ length: SIZE }, (_, i) => {
              const { x: x0 } = cellPos(0, i);
              const { y: y0 } = cellPos(i, 0);
              const { x: x1 } = cellPos(0, SIZE - 1);
              const { y: y1 } = cellPos(SIZE - 1, 0);
              return (
                <g key={i}>
                  <line x1={x0} y1={PAD} x2={x0} y2={y1} stroke={GRID_COLOR} strokeWidth={0.8} />
                  <line x1={PAD} y1={y0} x2={x1} y2={y0} stroke={GRID_COLOR} strokeWidth={0.8} />
                </g>
              );
            })}

            {/* Star points */}
            {[3, 9, 15].flatMap(r => [3, 9, 15].map(c => {
              const { x, y } = cellPos(r, c);
              return <circle key={`sp-${r}-${c}`} cx={x} cy={y} r={3} fill="rgba(153,66,240,0.3)" />;
            }))}

            {/* Click targets and stones */}
            {Array.from({ length: SIZE }, (_, r) =>
              Array.from({ length: SIZE }, (_, c) => {
                const { x, y } = cellPos(r, c);
                const stone = board[r][c];
                const isHover = !stone && hover?.r === r && hover?.c === c;
                return (
                  <g key={`${r},${c}`}
                    onClick={() => handleClick(r, c)}
                    onMouseEnter={() => !stone && setHover({ r, c })}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: stone ? 'default' : 'pointer' }}>
                    <rect x={x - CELL / 2} y={y - CELL / 2} width={CELL} height={CELL} fill="transparent" />
                    {stone && (
                      <circle cx={x} cy={y} r={R}
                        fill={colorOf(stone)}
                        stroke={strokeOf(stone)}
                        strokeWidth={1} />
                    )}
                    {isHover && (
                      <circle cx={x} cy={y} r={R}
                        fill={colorOf(currentPlayer)}
                        opacity={0.4} />
                    )}
                  </g>
                );
              })
            )}
          </svg>

          <CaptureSidebar
            pairsCount={captures.white}
            stoneColor={p1Color}
            strokeColor={strokeFor(p1Color)}
            label={'P2\ncaps'}
            svgHeight={sidebarHeight}
          />
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
          title={vsAI ? (winner !== aiPlayer ? 'YOU WIN!' : 'AI WINS!') : `${winner === 'black' ? 'Player 1' : 'Player 2'} wins!`}
          subtitle={captures[winner] >= 5 ? 'Five captures' : 'Five in a row'}
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

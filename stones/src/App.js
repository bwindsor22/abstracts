import React, { useState, useCallback, useEffect } from 'react';
import './App.css';
import { SIZE, initState, applyMove } from './Game';
import { getAIMove } from './AI/ai';

const CELL = 30;
const PAD = 20;
const BG = '#1a1a2e';
const GRID_COLOR = '#3a3a5a';

const COLOR_PALETTE = [
  { value: '#222',    label: 'Black'  },
  { value: '#f5f5f0', label: 'Ivory'  },
  { value: '#e05555', label: 'Red'    },
  { value: '#5588e0', label: 'Blue'   },
  { value: '#22aa55', label: 'Green'  },
  { value: '#e0a020', label: 'Gold'   },
  { value: '#8855cc', label: 'Purple' },
  { value: '#e06030', label: 'Orange' },
];

// Derive a stroke color from a fill color (darker border)
function strokeFor(fill) {
  if (fill === '#f5f5f0') return '#999';
  if (fill === '#222')    return '#555';
  return fill; // colored stones: same color looks fine; could darken if desired
}

function cellPos(r, c) {
  return { x: PAD + c * CELL, y: PAD + r * CELL };
}

function ColorPicker({ label, selected, onChange, disabledColor }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ color: '#8a78b8', marginBottom: 6, fontSize: 13 }}>{label}</div>
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

function StartScreen({ onStart }) {
  const [vsAI, setVsAI] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [p1Color, setP1Color] = useState('#222');
  const [p2Color, setP2Color] = useState('#f5f5f0');

  return (
    <div style={{ textAlign: 'center', padding: 40, maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ color: '#c8b8f8', marginBottom: 8 }}>PENTE</h1>
      <p style={{ color: '#8a78b8', marginBottom: 6 }}>Five in a row, or capture 5 pairs</p>
      <p style={{ color: '#6a5898', fontSize: 13, marginBottom: 24 }}>
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
        <label style={{ color: '#c8b8f8' }}>
          <input type="checkbox" checked={vsAI} onChange={e => setVsAI(e.target.checked)} style={{ marginRight: 8 }} />
          Play vs AI (Player 2)
        </label>
      </div>
      {vsAI && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#8a78b8', marginRight: 8 }}>Difficulty:</label>
          {['easy', 'medium', 'hard'].map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              style={{ margin: '0 4px', padding: '4px 12px', background: difficulty === d ? '#4a3a8a' : BG, color: '#c8b8f8', border: '1px solid #4a3a8a', borderRadius: 4, cursor: 'pointer' }}>
              {d}
            </button>
          ))}
        </div>
      )}
      <button onClick={() => onStart({ vsAI, difficulty, p1Color, p2Color })}
        style={{ padding: '12px 32px', background: '#4a3a8a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>
        Start Game
      </button>
    </div>
  );
}

// Renders a sidebar showing captured pairs as stone circles.
// pairsCount: number of pairs captured (each pair = 2 stones shown)
// stoneColor: fill color of the captured stones (opponent's color)
// strokeColor: border color
function CaptureSidebar({ pairsCount, stoneColor, strokeColor, label, svgHeight }) {
  const stoneR = 10;
  const stoneD = stoneR * 2 + 4; // diameter + gap
  const sidebarWidth = 48;
  const cx = sidebarWidth / 2;

  const totalStones = pairsCount * 2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: sidebarWidth }}>
      <div style={{ color: '#8a78b8', fontSize: 11, marginBottom: 4, textAlign: 'center', lineHeight: 1.2 }}>{label}</div>
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

export default function App() {
  const [gs, setGs] = useState(null);
  const [hover, setHover] = useState(null);

  const handleStart = useCallback((opts) => {
    setGs(initState({ vsAI: opts.vsAI, aiPlayer: 'white', difficulty: opts.difficulty,
                      p1Color: opts.p1Color, p2Color: opts.p2Color }));
    setHover(null);
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

  if (!gs) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <StartScreen onStart={handleStart} />
      </div>
    );
  }

  const { board, captures, currentPlayer, winner, vsAI, aiPlayer, p1Color, p2Color } = gs;
  const svgSize = PAD * 2 + (SIZE - 1) * CELL;
  const R = CELL * 0.43;

  // Map player name to color
  const colorOf = (player) => player === 'black' ? p1Color : p2Color;
  const strokeOf = (player) => strokeFor(colorOf(player));

  const statusMsg = winner
    ? `${winner === 'black' ? 'Player 1' : 'Player 2'} WINS!`
    : vsAI && currentPlayer === aiPlayer
    ? 'AI thinking...'
    : `${currentPlayer === 'black' ? 'Player 1' : 'Player 2'}'s turn`;
  const cpColor = '#c8b8f8';

  // Sidebar: left = P1's captures (opponent was P2, so show P2 color stones), right = P2's captures
  const sidebarHeight = svgSize;

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ color: winner ? '#ffe066' : cpColor, fontSize: 18, fontWeight: 'bold' }}>{statusMsg}</div>

        <div style={{ display: 'flex', gap: 32, color: '#c8b8f8', fontSize: 13 }}>
          <span>P1 captures: {captures.black}/5</span>
          <span>P2 captures: {captures.white}/5</span>
        </div>

        {/* Board row: [P1 captures sidebar] [board] [P2 captures sidebar] */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <CaptureSidebar
            pairsCount={captures.black}
            stoneColor={p2Color}
            strokeColor={strokeFor(p2Color)}
            label={'P1\ncaps'}
            svgHeight={sidebarHeight}
          />

          <svg width={svgSize} height={svgSize}
            style={{ background: '#d4a96a', borderRadius: 4, border: '2px solid #8a6a30', display: 'block' }}>

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
              return <circle key={`sp-${r}-${c}`} cx={x} cy={y} r={3} fill={GRID_COLOR} />;
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

        <button onClick={() => setGs(null)}
          style={{ padding: '8px 20px', background: '#4a3a8a', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
          New Game
        </button>
      </div>
    </div>
  );
}

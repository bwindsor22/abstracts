import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import WinOverlay from '../../components/WinOverlay';
import { SIZE, initState, applyMove, applyPass, isLegal } from './Game';
import { getAIMove } from './AI/ai';

const CELL = 44;
const PAD = 28;

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

const STAR_POINTS_9 = [[2,2],[2,6],[6,2],[6,6],[4,4]];

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
  const [difficulty, setDifficulty] = useState('medium');
  const [p1Color, setP1Color] = useState('#222');
  const [p2Color, setP2Color] = useState('#f5f5f0');

  return (
    <div className="start-screen" style={{ textAlign: 'center' }}>
      <h1>STONES</h1>
      <p className="start-desc">Territory through influence</p>
      <p className="start-rule">
        Place stones on a 9×9 board. Surround territory and capture<br />
        opponent stones by removing all their liberties. Game ends<br />
        when both players pass. Highest score wins.
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

      <div className="difficulty-row">
        <label>Difficulty:</label>
        {['easy', 'medium', 'hard'].map(d => (
          <button key={d} onClick={() => setDifficulty(d)}
            className={`diff-btn${difficulty === d ? ' active' : ''}`}>
            {d}
          </button>
        ))}
      </div>
      <button onClick={() => onStart({ vsAI: true, aiPlayer: 'white', difficulty, p1Color, p2Color })}
        className="btn-primary">
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
  const [hover, setHover] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [p1Color, setP1Color] = useState('#222');
  const [p2Color, setP2Color] = useState('#f5f5f0');
  const resultReported = useRef(false);

  const handleStart = useCallback((opts) => {
    setP1Color(opts.p1Color || '#222');
    setP2Color(opts.p2Color || '#f5f5f0');
    setGs(initState(opts));
    setHover(null);
    resultReported.current = false;
  }, []);

  const handleClick = useCallback((r, c) => {
    if (!gs || gs.winner) return;
    if (gs.vsAI && gs.turn === gs.aiPlayer) return;
    if (!isLegal(gs, r, c)) return;
    setGs(s => applyMove(s, r, c));
  }, [gs]);

  const handlePass = useCallback(() => {
    if (!gs || gs.winner) return;
    if (gs.vsAI && gs.turn === gs.aiPlayer) return;
    setGs(s => applyPass(s));
  }, [gs]);

  // AI turn
  useEffect(() => {
    if (!gs || gs.winner) return;
    if (!gs.vsAI || gs.turn !== gs.aiPlayer) return;
    const timer = setTimeout(() => {
      const move = getAIMove(gs, gs.aiPlayer, gs.difficulty);
      if (move[0] === -1 && move[1] === -1) {
        setGs(s => applyPass(s));
      } else {
        setGs(s => applyMove(s, move[0], move[1]));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [gs]);

  // Report result
  useEffect(() => {
    if (!gs?.winner || resultReported.current) return;
    resultReported.current = true;
    if (onResult) {
      onResult({
        gameId: 'go',
        gameName: 'Stones',
        won: gs.winner === 'black',
        moves: gs.moveCount,
        difficulty: gs.difficulty,
        score: gs.score,
      });
    }
  }, [gs?.winner, onResult]);

  if (!gs) {
    return (
      <div className="game-go" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <StartScreen onStart={handleStart} onBack={onBack} />
      </div>
    );
  }

  const { board, turn, winner, captures, vsAI, aiPlayer, lastMove, score } = gs;
  const svgSize = PAD * 2 + (SIZE - 1) * CELL;
  const R = CELL * 0.43;

  const colorOf = (player) => player === 'black' ? p1Color : p2Color;
  const strokeOf = (player) => strokeFor(colorOf(player));

  const statusMsg = winner
    ? winner === 'draw' ? 'DRAW!'
    : score
      ? `${winner === 'black' ? 'Black' : 'White'} wins! (${score.black} - ${score.white})`
      : `${winner === 'black' ? 'Black' : 'White'} WINS!`
    : vsAI && turn === aiPlayer
    ? 'AI thinking...'
    : `${turn === 'black' ? 'Black' : 'White'}'s turn`;

  const captureInfo = `Captures — Black: ${captures.black}  White: ${captures.white}`;

  return (
    <div className="game-go" style={{ padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div className="status-bar" style={{ color: winner ? '#ffe066' : 'rgba(240,238,255,0.85)' }}>{statusMsg}</div>
        <div className="capture-info">{captureInfo}</div>

        <svg width={svgSize} height={svgSize}
          style={{ background: '#c8a455', borderRadius: 4, border: '1px solid rgba(153,66,240,0.2)', display: 'block' }}>

          {/* Grid lines */}
          {Array.from({ length: SIZE }, (_, i) => {
            const { x: x0 } = cellPos(0, i);
            const { y: y0 } = cellPos(i, 0);
            const { x: x1 } = cellPos(0, SIZE - 1);
            const { y: y1 } = cellPos(SIZE - 1, 0);
            return (
              <g key={i}>
                <line x1={x0} y1={PAD} x2={x0} y2={y1} stroke="rgba(0,0,0,0.4)" strokeWidth={0.8} />
                <line x1={PAD} y1={y0} x2={x1} y2={y0} stroke="rgba(0,0,0,0.4)" strokeWidth={0.8} />
              </g>
            );
          })}

          {/* Star points */}
          {STAR_POINTS_9.map(([r, c]) => {
            const { x, y } = cellPos(r, c);
            return <circle key={`sp-${r}-${c}`} cx={x} cy={y} r={3} fill="rgba(0,0,0,0.5)" />;
          })}

          {/* Click targets and stones */}
          {Array.from({ length: SIZE }, (_, r) =>
            Array.from({ length: SIZE }, (_, c) => {
              const { x, y } = cellPos(r, c);
              const stone = board[r][c];
              const isHover = !stone && hover?.r === r && hover?.c === c && isLegal(gs, r, c);
              const isLastMove = lastMove && lastMove[0] === r && lastMove[1] === c;
              return (
                <g key={`${r},${c}`}
                  onClick={() => handleClick(r, c)}
                  onMouseEnter={() => !stone && setHover({ r, c })}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: stone ? 'default' : 'pointer' }}>
                  <rect x={x - CELL / 2} y={y - CELL / 2} width={CELL} height={CELL} fill="transparent" />
                  {stone && (
                    <>
                      <circle cx={x} cy={y} r={R}
                        fill={colorOf(stone)}
                        stroke={strokeOf(stone)}
                        strokeWidth={1} />
                      {isLastMove && (
                        <circle cx={x} cy={y} r={R * 0.35}
                          fill="none" stroke={stone === 'black' ? '#fff' : '#000'}
                          strokeWidth={1.5} opacity={0.6} />
                      )}
                    </>
                  )}
                  {isHover && (
                    <circle cx={x} cy={y} r={R}
                      fill={colorOf(turn)}
                      opacity={0.4} />
                  )}
                </g>
              );
            })
          )}
        </svg>

        <div className="game-controls">
          <button className="ctrl-btn"
            onClick={handlePass}
            disabled={!!winner || (vsAI && turn === aiPlayer)}>
            PASS
          </button>
          <button className="ctrl-btn" onClick={() => setMenuOpen(true)}>MENU</button>
        </div>
      </div>

      {winner && winner !== 'draw' && (
        <WinOverlay
          title={vsAI ? (winner !== aiPlayer ? 'YOU WIN!' : 'AI WINS!') : `${winner} wins!`}
          subtitle={score ? `${score.black} – ${score.white}` : 'Game over'}
          onNewGame={() => setGs(null)}
          onHome={onBack}
        />
      )}

      {winner === 'draw' && (
        <WinOverlay
          title="DRAW!"
          subtitle={score ? `${score.black} – ${score.white}` : 'Equal territory'}
          onNewGame={() => setGs(null)}
          onHome={onBack}
        />
      )}

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

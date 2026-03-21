import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import WinOverlay from '../../components/WinOverlay';
import { SIZE, initState, applyMove, getLegalMoves, countDiscs } from './Game';
import { getAIMove } from './AI/ai';

const CELL = 56;
const PAD = 28;
const BOARD_BG = '#0d6b3a';
const LINE_COLOR = 'rgba(0,0,0,0.25)';

function StartScreen({ onStart, onBack }) {
  const [vsAI, setVsAI] = useState(true);
  const [difficulty, setDifficulty] = useState('medium');

  return (
    <div className="start-screen" style={{ textAlign: 'center' }}>
      <h1>FLIPS</h1>
      <p className="start-desc">Outflank and conquer</p>
      <p className="start-rule">
        Place discs to sandwich your opponent's pieces and flip them to your color.<br />
        The player with the most discs when the board is full wins.
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
  const resultReported = useRef(false);

  const handleStart = useCallback((opts) => {
    setGs(initState({ vsAI: opts.vsAI, aiPlayer: 'white', difficulty: opts.difficulty,
                      p1Color: '#222', p2Color: '#f5f5f0' }));
    setHover(null);
    resultReported.current = false;
  }, []);

  const handleClick = useCallback((r, c) => {
    if (!gs || gs.winner) return;
    if (gs.vsAI && gs.currentPlayer === gs.aiPlayer) return;
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
        gameId: 'flips',
        gameName: 'Flips',
        won: gs.winner === 'black',
        moves: gs.moveCount || 0,
        difficulty: gs.difficulty || 'medium',
      });
    }
  }, [gs?.winner, onResult]);

  if (!gs) {
    return (
      <div className="game-flips" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <StartScreen onStart={handleStart} onBack={onBack} />
      </div>
    );
  }

  const { board, currentPlayer, winner, vsAI, aiPlayer } = gs;
  const legalMoves = winner ? [] : getLegalMoves(board, currentPlayer);
  const legalSet = new Set(legalMoves.map(([r, c]) => `${r},${c}`));
  const counts = countDiscs(board);
  const svgSize = PAD * 2 + SIZE * CELL;
  const R = CELL * 0.42;

  const statusMsg = winner
    ? winner === 'draw' ? 'DRAW!'
    : `${winner === 'black' ? 'Black' : 'White'} WINS!`
    : vsAI && currentPlayer === aiPlayer
    ? 'AI thinking...'
    : `${currentPlayer === 'black' ? 'Black' : 'White'}'s turn`;

  return (
    <div className="game-flips" style={{ padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div className="status-bar" style={{ color: winner ? '#ffe066' : 'rgba(240,238,255,0.85)' }}>{statusMsg}</div>

        <div className="score-row">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="#222" stroke="#555" strokeWidth="1" /></svg>
            {counts.black}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="#f5f5f0" stroke="#999" strokeWidth="1" /></svg>
            {counts.white}
          </span>
        </div>

        <svg width={svgSize} height={svgSize}
          style={{ background: BOARD_BG, borderRadius: 4, border: '1px solid rgba(0,0,0,0.3)', display: 'block' }}>

          {/* Grid lines */}
          {Array.from({ length: SIZE + 1 }, (_, i) => {
            const pos = PAD + i * CELL;
            return (
              <g key={i}>
                <line x1={pos} y1={PAD} x2={pos} y2={PAD + SIZE * CELL} stroke={LINE_COLOR} strokeWidth={1} />
                <line x1={PAD} y1={pos} x2={PAD + SIZE * CELL} y2={pos} stroke={LINE_COLOR} strokeWidth={1} />
              </g>
            );
          })}

          {/* Cells, discs, legal move hints */}
          {Array.from({ length: SIZE }, (_, r) =>
            Array.from({ length: SIZE }, (_, c) => {
              const cx = PAD + c * CELL + CELL / 2;
              const cy = PAD + r * CELL + CELL / 2;
              const disc = board[r][c];
              const isLegal = legalSet.has(`${r},${c}`);
              const isHover = hover?.r === r && hover?.c === c && isLegal;
              return (
                <g key={`${r},${c}`}
                  onClick={() => handleClick(r, c)}
                  onMouseEnter={() => isLegal && setHover({ r, c })}
                  onMouseLeave={() => setHover(null)}
                  style={{ cursor: isLegal ? 'pointer' : 'default' }}>
                  <rect x={PAD + c * CELL} y={PAD + r * CELL} width={CELL} height={CELL} fill="transparent" />
                  {disc && (
                    <circle cx={cx} cy={cy} r={R}
                      fill={disc === 'black' ? '#222' : '#f5f5f0'}
                      stroke={disc === 'black' ? '#555' : '#999'}
                      strokeWidth={1.5} />
                  )}
                  {!disc && isLegal && !isHover && (
                    <circle cx={cx} cy={cy} r={4}
                      fill="rgba(255,255,255,0.25)" />
                  )}
                  {isHover && (
                    <circle cx={cx} cy={cy} r={R}
                      fill={currentPlayer === 'black' ? '#222' : '#f5f5f0'}
                      opacity={0.5} />
                  )}
                </g>
              );
            })
          )}
        </svg>

        <div className="game-controls">
          <button className="ctrl-btn" disabled>UNDO</button>
          <button className="ctrl-btn" onClick={() => setMenuOpen(true)}>MENU</button>
        </div>
      </div>

      {winner && winner !== 'draw' && (
        <WinOverlay
          title={vsAI ? (winner !== aiPlayer ? 'YOU WIN!' : 'AI WINS!') : `${winner === 'black' ? 'Black' : 'White'} wins!`}
          subtitle={`${counts.black} – ${counts.white}`}
          onNewGame={() => setGs(null)}
          onHome={onBack}
        />
      )}

      {winner === 'draw' && (
        <WinOverlay
          title="DRAW!"
          subtitle={`${counts.black} – ${counts.white}`}
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

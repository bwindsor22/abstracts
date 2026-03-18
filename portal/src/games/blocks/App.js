import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import './App.css';
import WinOverlay from '../../components/WinOverlay';
import {
  initState, getAllMoves, applyMove, canPlace,
  SIZE, COLORS, PIECE_ORIENTATIONS, PIECE_IDS, PIECE_SIZES,
  HUMAN_COLORS, AI_COLORS, getScore,
} from './Game';
import { getAIMove } from './AI/ai';

const CELL = 24;
const COLOR_MAP = {
  blue: '#3B82F6',
  yellow: '#FACC15',
  red: '#EF4444',
  green: '#22C55E',
};
const COLOR_MAP_DIM = {
  blue: 'rgba(59,130,246,0.25)',
  yellow: 'rgba(250,204,21,0.25)',
  red: 'rgba(239,68,68,0.25)',
  green: 'rgba(34,197,94,0.25)',
};

function StartScreen({ onStart, onBack }) {
  const [difficulty, setDifficulty] = useState('medium');
  return (
    <div style={{ textAlign: 'center', padding: 40, maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ color: '#c8b8e8', marginBottom: 8 }}>BLOCKS</h1>
      <p style={{ color: '#8a7ab0', marginBottom: 6 }}>Fit as many pieces on the board as you can</p>
      <p style={{ color: '#7a6ab0', fontSize: 13, marginBottom: 24 }}>
        Place polyomino pieces corner-to-corner with your own color.<br />
        Never touch same-color edges. Cover the most squares to win.
      </p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ color: '#8a7ab0', marginRight: 8 }}>Difficulty:</label>
        {['easy', 'medium', 'hard'].map(d => (
          <button key={d} onClick={() => setDifficulty(d)}
            style={{ margin: '0 4px', padding: '4px 12px', background: difficulty === d ? '#5a3a8a' : '#191022', color: '#c8b8e8', border: '1px solid #5a3a8a', borderRadius: 4, cursor: 'pointer' }}>
            {d}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
        <button onClick={() => onStart({ difficulty })}
          style={{ padding: '12px 32px', background: '#5a3a8a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 18, cursor: 'pointer' }}>
          Start Game
        </button>
        {onBack && (
          <button onClick={onBack}
            style={{ padding: '12px 20px', background: 'transparent', color: '#8a7ab0', border: '1px solid #5a3a8a', borderRadius: 8, fontSize: 16, cursor: 'pointer' }}>
            ← Home
          </button>
        )}
      </div>
    </div>
  );
}

// Mini SVG preview of a piece shape
function PieceMini({ pieceId, orientation, color, size = 8 }) {
  const cells = PIECE_ORIENTATIONS[pieceId][orientation];
  const maxR = Math.max(...cells.map(c => c[0])) + 1;
  const maxC = Math.max(...cells.map(c => c[1])) + 1;
  return (
    <svg width={maxC * size + 1} height={maxR * size + 1}>
      {cells.map(([r, c], i) => (
        <rect key={i} x={c * size + 0.5} y={r * size + 0.5}
          width={size - 1} height={size - 1}
          fill={COLOR_MAP[color]} rx={1}
        />
      ))}
    </svg>
  );
}

export default function App({ onBack, onResult }) {
  const [gs, setGs] = useState(null);
  const [selected, setSelected] = useState(null); // { pieceId, orientation }
  const [hoverCell, setHoverCell] = useState(null); // [r, c]
  const [menuOpen, setMenuOpen] = useState(false);
  const resultFired = useRef(false);

  const handleStart = useCallback((opts) => {
    setGs(initState(opts));
    setSelected(null);
    setHoverCell(null);
    resultFired.current = false;
  }, []);

  const isHumanTurn = gs && !gs.winner && HUMAN_COLORS.includes(gs.currentColor);
  const currentColor = gs?.currentColor;

  // Compute valid moves for current piece selection
  const validPlacements = useMemo(() => {
    if (!gs || !selected || !isHumanTurn) return new Set();
    const color = gs.currentColor;
    const cells = PIECE_ORIENTATIONS[selected.pieceId][selected.orientation];
    const isFirst = !gs.board.some(row => row.some(cell => cell === color));
    const valid = new Set();
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (canPlace(gs.board, color, cells, r, c, isFirst)) {
          valid.add(r * SIZE + c);
        }
      }
    }
    return valid;
  }, [gs, selected, isHumanTurn]);

  // Ghost preview cells
  const ghostCells = useMemo(() => {
    if (!selected || !hoverCell || !validPlacements.has(hoverCell[0] * SIZE + hoverCell[1])) return [];
    const cells = PIECE_ORIENTATIONS[selected.pieceId][selected.orientation];
    return cells.map(([dr, dc]) => [hoverCell[0] + dr, hoverCell[1] + dc]);
  }, [selected, hoverCell, validPlacements]);

  const ghostSet = useMemo(() => new Set(ghostCells.map(([r, c]) => r * SIZE + c)), [ghostCells]);

  const handleCellClick = useCallback((r, c) => {
    if (!gs || gs.winner || !isHumanTurn || !selected) return;
    if (!validPlacements.has(r * SIZE + c)) return;
    const move = { pieceId: selected.pieceId, orientation: selected.orientation, row: r, col: c };
    setGs(s => applyMove(s, s.currentColor, move));
    setSelected(null);
    setHoverCell(null);
  }, [gs, isHumanTurn, selected, validPlacements]);

  const handleRotate = useCallback(() => {
    if (!selected) return;
    const maxOr = PIECE_ORIENTATIONS[selected.pieceId].length;
    setSelected(s => ({ ...s, orientation: (s.orientation + 1) % maxOr }));
  }, [selected]);

  const handleFlip = useCallback(() => {
    if (!selected) return;
    const orientations = PIECE_ORIENTATIONS[selected.pieceId];
    // Find a different orientation (try jumping halfway)
    const maxOr = orientations.length;
    const half = Math.floor(maxOr / 2);
    setSelected(s => ({ ...s, orientation: (s.orientation + half) % maxOr }));
  }, [selected]);

  const handlePass = useCallback(() => {
    if (!gs || gs.winner || !isHumanTurn) return;
    // Pass: mark current color as passed and advance
    setGs(s => {
      const passed = { ...s.passed, [s.currentColor]: true };
      let nextIndex = (s.turnIndex + 1) % 4;
      for (let i = 0; i < 4; i++) {
        const ci = (s.turnIndex + 1 + i) % 4;
        if (!passed[COLORS[ci]]) { nextIndex = ci; break; }
      }
      const allPassed = COLORS.every(c => passed[c]);
      return { ...s, passed, currentColor: COLORS[nextIndex], turnIndex: nextIndex, winner: allPassed ? 'done' : null };
    });
    setSelected(null);
  }, [gs, isHumanTurn]);

  // AI moves
  useEffect(() => {
    if (!gs || gs.winner) return;
    if (!AI_COLORS.includes(gs.currentColor)) return;
    const timer = setTimeout(() => {
      const move = getAIMove(gs, gs.difficulty);
      if (move) {
        setGs(s => applyMove(s, s.currentColor, move));
      } else {
        // AI passes
        setGs(s => {
          const passed = { ...s.passed, [s.currentColor]: true };
          let nextIndex = (s.turnIndex + 1) % 4;
          for (let i = 0; i < 4; i++) {
            const ci = (s.turnIndex + 1 + i) % 4;
            if (!passed[COLORS[ci]]) { nextIndex = ci; break; }
          }
          const allPassed = COLORS.every(c => passed[c]);
          return { ...s, passed, currentColor: COLORS[nextIndex], turnIndex: nextIndex, winner: allPassed ? 'done' : null };
        });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [gs]);

  // Auto-pass for human when no moves available
  useEffect(() => {
    if (!gs || gs.winner) return;
    if (!HUMAN_COLORS.includes(gs.currentColor)) return;
    const moves = getAllMoves(gs, gs.currentColor);
    if (moves.length === 0) {
      const timer = setTimeout(() => {
        setGs(s => {
          const passed = { ...s.passed, [s.currentColor]: true };
          let nextIndex = (s.turnIndex + 1) % 4;
          for (let i = 0; i < 4; i++) {
            const ci = (s.turnIndex + 1 + i) % 4;
            if (!passed[COLORS[ci]]) { nextIndex = ci; break; }
          }
          const allPassed = COLORS.every(c => passed[c]);
          return { ...s, passed, currentColor: COLORS[nextIndex], turnIndex: nextIndex, winner: allPassed ? 'done' : null };
        });
        setSelected(null);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [gs]);

  // Report result
  useEffect(() => {
    if (!gs || !gs.winner || resultFired.current) return;
    resultFired.current = true;
    const humanScore = getScore(gs.hands, HUMAN_COLORS);
    const aiScore = getScore(gs.hands, AI_COLORS);
    if (onResult) onResult({
      gameId: 'blocks',
      gameName: 'Blocks',
      won: humanScore > aiScore,
      moves: 0,
      difficulty: gs.difficulty || 'medium',
    });
  }, [gs, onResult]);

  if (!gs) {
    return (
      <div className="game-blocks" style={{ justifyContent: 'center' }}>
        <StartScreen onStart={handleStart} onBack={onBack} />
      </div>
    );
  }

  const humanScore = getScore(gs.hands, HUMAN_COLORS);
  const aiScore = getScore(gs.hands, AI_COLORS);

  const statusMsg = gs.winner
    ? (humanScore > aiScore ? 'YOU WIN!' : aiScore > humanScore ? 'AI WINS!' : 'DRAW!')
    : AI_COLORS.includes(gs.currentColor)
      ? 'AI thinking...'
      : `Your turn (${gs.currentColor})`;
  const statusColor = gs.winner ? '#ffe066' : COLOR_MAP[gs.currentColor];

  return (
    <div className="game-blocks">
      <div className="blocks-status" style={{ color: statusColor }}>{statusMsg}</div>

      {/* Scores */}
      <div className="blocks-scores">
        {COLORS.map(c => {
          const remaining = [...gs.hands[c]].reduce((sum, pid) => sum + PIECE_SIZES[pid], 0);
          return (
            <div key={c} className="blocks-score-item" style={{ opacity: gs.passed[c] ? 0.4 : 1 }}>
              <div className="blocks-score-dot" style={{ background: COLOR_MAP[c] }} />
              <span style={{ color: '#c8b8e8' }}>{remaining}</span>
            </div>
          );
        })}
      </div>

      {/* Board */}
      <div className="blocks-board-wrap">
        <svg
          width={SIZE * CELL + 1}
          height={SIZE * CELL + 1}
          style={{ display: 'block', borderRadius: 4, border: '1px solid rgba(153,66,240,0.2)' }}
        >
          {/* Grid */}
          {Array.from({ length: SIZE }, (_, r) =>
            Array.from({ length: SIZE }, (_, c) => {
              const color = gs.board[r][c];
              const isGhost = ghostSet.has(r * SIZE + c);
              const isValid = selected && validPlacements.has(r * SIZE + c);
              let fill = (r + c) % 2 === 0 ? '#1e1030' : '#1a0c28';
              if (color) fill = COLOR_MAP[color];
              else if (isGhost) fill = COLOR_MAP_DIM[currentColor];
              return (
                <rect
                  key={`${r}-${c}`}
                  x={c * CELL + 0.5}
                  y={r * CELL + 0.5}
                  width={CELL - 1}
                  height={CELL - 1}
                  fill={fill}
                  stroke={isValid && !color ? 'rgba(255,230,0,0.2)' : 'transparent'}
                  strokeWidth={0.5}
                  rx={1}
                  style={{ cursor: isHumanTurn && selected ? 'pointer' : 'default' }}
                  onClick={() => handleCellClick(r, c)}
                  onMouseEnter={() => setHoverCell([r, c])}
                  onMouseLeave={() => setHoverCell(null)}
                />
              );
            })
          )}
        </svg>
      </div>

      {/* Controls */}
      {isHumanTurn && (
        <div className="blocks-controls">
          <button className="blocks-ctrl-btn" onClick={handleRotate} disabled={!selected}>
            ROTATE
          </button>
          <button className="blocks-ctrl-btn" onClick={handleFlip} disabled={!selected}>
            FLIP
          </button>
          <button className="blocks-ctrl-btn" onClick={handlePass}>
            PASS
          </button>
          <button className="blocks-ctrl-btn" onClick={() => setMenuOpen(true)}>
            MENU
          </button>
        </div>
      )}

      {/* Piece tray — show current human color's pieces */}
      {isHumanTurn && (
        <div className="blocks-tray">
          {PIECE_IDS.map(pid => {
            const used = !gs.hands[currentColor].has(pid);
            const isSel = selected?.pieceId === pid;
            return (
              <button
                key={pid}
                className={`blocks-piece-btn${isSel ? ' selected' : ''}${used ? ' used' : ''}`}
                onClick={() => {
                  if (used) return;
                  setSelected(isSel ? null : { pieceId: pid, orientation: 0 });
                }}
              >
                <PieceMini pieceId={pid} orientation={isSel ? selected.orientation : 0} color={currentColor} />
              </button>
            );
          })}
        </div>
      )}

      {/* Win overlay */}
      {gs.winner && (
        <WinOverlay
          title={humanScore > aiScore ? 'YOU WIN!' : aiScore > humanScore ? 'AI WINS!' : 'DRAW!'}
          subtitle={`You: ${humanScore} pts | AI: ${aiScore} pts`}
          onNewGame={() => { resultFired.current = false; setGs(null); setSelected(null); }}
          onHome={onBack}
        />
      )}

      {/* Menu */}
      {menuOpen && (
        <div className="game-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="game-menu-panel" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(false)}>Resume</button>
            <button onClick={() => { resultFired.current = false; setGs(null); setSelected(null); setMenuOpen(false); }}>New Game</button>
            {onBack && <button onClick={onBack}>Back to Library</button>}
          </div>
        </div>
      )}
    </div>
  );
}

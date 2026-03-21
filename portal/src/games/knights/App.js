import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import WinOverlay from '../../components/WinOverlay';
import { initState, applyMove, getLegalMoves, isInCheck, moveKey } from './Game';
import { getAIMove } from './AI/ai';

const CELL = 56;
const PAD = 20;
const BOARD_SIZE = PAD * 2 + 8 * CELL;

const FILES = ['a','b','c','d','e','f','g','h'];
const RANKS = ['8','7','6','5','4','3','2','1'];

// Unicode chess pieces
const PIECE_CHARS = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

function cellCenter(r, c) {
  return { x: PAD + c * CELL + CELL / 2, y: PAD + r * CELL + CELL / 2 };
}

function StartScreen({ onStart, onBack }) {
  const [difficulty, setDifficulty] = useState('medium');
  const [playAs, setPlayAs] = useState('w');

  return (
    <div className="start-screen">
      <h1>KNIGHTS</h1>
      <p className="start-desc">The king of strategy games</p>
      <p className="start-rule">
        Standard chess. Click a piece to see its legal moves.<br />
        Includes castling, en passant, and promotion.
      </p>
      <div style={{ marginBottom: 16 }}>
        <div className="color-picker-label">Play as</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={() => setPlayAs('w')}
            className={`diff-btn${playAs === 'w' ? ' active' : ''}`}>
            White
          </button>
          <button onClick={() => setPlayAs('b')}
            className={`diff-btn${playAs === 'b' ? ' active' : ''}`}>
            Black
          </button>
        </div>
      </div>
      <div className="difficulty-row">
        <label>Difficulty:</label>
        {['easy', 'medium', 'hard'].map(d => (
          <button key={d} onClick={() => setDifficulty(d)}
            className={`diff-btn${difficulty === d ? ' active' : ''}`}>
            {d}
          </button>
        ))}
      </div>
      <button onClick={() => onStart({ vsAI: true, aiPlayer: playAs === 'w' ? 'b' : 'w', difficulty })} className="btn-primary">
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
  const [selected, setSelected] = useState(null); // [r, c]
  const [menuOpen, setMenuOpen] = useState(false);
  const resultReported = useRef(false);

  const handleStart = useCallback((opts) => {
    setGs(initState(opts));
    setSelected(null);
    resultReported.current = false;
  }, []);

  const legalMoves = gs && !gs.winner ? getLegalMoves(gs) : [];
  const selectedMoves = selected
    ? legalMoves.filter(m => m.from[0] === selected[0] && m.from[1] === selected[1])
    : [];
  const targetSet = new Set(selectedMoves.map(m => `${m.to[0]},${m.to[1]}`));

  const isPlayerTurn = gs && !gs.winner && gs.turn !== gs.aiPlayer;
  const inCheck = gs && !gs.winner ? isInCheck(gs.board, gs.turn) : false;

  const handleSquareClick = useCallback((r, c) => {
    if (!gs || gs.winner || !isPlayerTurn) return;

    // If clicking a target square, make the move
    if (selected && targetSet.has(`${r},${c}`)) {
      const move = selectedMoves.find(m => m.to[0] === r && m.to[1] === c);
      if (move) {
        // If multiple moves to same square (promotion), default to queen
        const promoMoves = selectedMoves.filter(m => m.to[0] === r && m.to[1] === c);
        const bestMove = promoMoves.find(m => m.promo === 'Q') || promoMoves[0];
        setGs(s => applyMove(s, bestMove));
        setSelected(null);
        return;
      }
    }

    // Select own piece
    const piece = gs.board[r][c];
    if (piece && piece[0] === gs.turn) {
      setSelected(selected && selected[0] === r && selected[1] === c ? null : [r, c]);
    } else {
      setSelected(null);
    }
  }, [gs, isPlayerTurn, selected, selectedMoves, targetSet]);

  // AI turn
  useEffect(() => {
    if (!gs || gs.winner) return;
    if (gs.turn !== gs.aiPlayer) return;
    const timer = setTimeout(() => {
      const move = getAIMove(gs, gs.aiPlayer, gs.difficulty);
      if (move) setGs(s => applyMove(s, move));
    }, 400);
    return () => clearTimeout(timer);
  }, [gs]);

  // Report result
  useEffect(() => {
    if (!gs?.winner || resultReported.current) return;
    resultReported.current = true;
    if (onResult) {
      const playerColor = gs.aiPlayer === 'b' ? 'w' : 'b';
      onResult({
        gameId: 'knights',
        gameName: 'Knights',
        won: gs.winner === playerColor,
        moves: gs.moveCount,
        difficulty: gs.difficulty,
      });
    }
  }, [gs?.winner, onResult]);

  if (!gs) {
    return (
      <div className="game-knights">
        <StartScreen onStart={handleStart} onBack={onBack} />
      </div>
    );
  }

  const { board, turn, winner, aiPlayer, lastMove } = gs;
  const playerColor = aiPlayer === 'b' ? 'w' : 'b';
  const lastFrom = lastMove ? `${lastMove.from[0]},${lastMove.from[1]}` : null;
  const lastTo = lastMove ? `${lastMove.to[0]},${lastMove.to[1]}` : null;

  const statusMsg = winner
    ? winner === 'draw' ? 'DRAW!'
    : winner === playerColor ? 'YOU WIN!' : 'AI WINS!'
    : turn === aiPlayer
    ? 'AI thinking...'
    : inCheck ? 'CHECK! Your move' : 'Your move';

  return (
    <div className="game-knights">
      <div className="knights-layout">
        <div className="status-bar" style={{ color: winner ? '#ffe066' : inCheck ? '#ff6644' : '#f0eeff' }}>
          {statusMsg}
        </div>

        <svg width={BOARD_SIZE} height={BOARD_SIZE} viewBox={`0 0 ${BOARD_SIZE} ${BOARD_SIZE}`}
          style={{ display: 'block', maxWidth: '100%' }}>

          {/* Board squares */}
          {Array.from({ length: 8 }, (_, r) =>
            Array.from({ length: 8 }, (_, c) => {
              const light = (r + c) % 2 === 0;
              const isSelected = selected && selected[0] === r && selected[1] === c;
              const isTarget = targetSet.has(`${r},${c}`);
              const isLast = `${r},${c}` === lastFrom || `${r},${c}` === lastTo;
              const isCapture = isTarget && board[r][c] !== null;

              let fill = light ? '#e8dcc8' : '#a07850';
              if (isSelected) fill = '#ffe066';
              else if (isLast) fill = light ? '#f0e8a0' : '#c8b060';

              return (
                <g key={`${r},${c}`} onClick={() => handleSquareClick(r, c)}
                  style={{ cursor: 'pointer' }}>
                  <rect x={PAD + c * CELL} y={PAD + r * CELL}
                    width={CELL} height={CELL} fill={fill} />

                  {/* Legal move indicator */}
                  {isTarget && !isCapture && (
                    <circle cx={PAD + c * CELL + CELL / 2} cy={PAD + r * CELL + CELL / 2}
                      r={7} fill="rgba(0,0,0,0.2)" />
                  )}
                  {isTarget && isCapture && (
                    <circle cx={PAD + c * CELL + CELL / 2} cy={PAD + r * CELL + CELL / 2}
                      r={CELL / 2 - 3} fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth={5} />
                  )}

                  {/* Piece */}
                  {board[r][c] && (
                    <text x={PAD + c * CELL + CELL / 2} y={PAD + r * CELL + CELL / 2 + 2}
                      textAnchor="middle" dominantBaseline="central"
                      fontSize={CELL * 0.7} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                      {PIECE_CHARS[board[r][c]]}
                    </text>
                  )}
                </g>
              );
            })
          )}

          {/* File labels */}
          {FILES.map((f, i) => (
            <text key={f} x={PAD + i * CELL + CELL / 2} y={BOARD_SIZE - 4}
              textAnchor="middle" fontSize={11} fill="rgba(240,238,255,0.4)">{f}</text>
          ))}
          {/* Rank labels */}
          {RANKS.map((rk, i) => (
            <text key={rk} x={8} y={PAD + i * CELL + CELL / 2 + 4}
              textAnchor="middle" fontSize={11} fill="rgba(240,238,255,0.4)">{rk}</text>
          ))}
        </svg>

        <div className="game-controls">
          <button className="ctrl-btn" onClick={() => setMenuOpen(true)}>MENU</button>
        </div>
      </div>

      {winner && winner !== 'draw' && (
        <WinOverlay
          title={winner === playerColor ? 'YOU WIN!' : 'AI WINS!'}
          subtitle={winner === playerColor ? 'Checkmate!' : 'Checkmate'}
          onNewGame={() => setGs(null)}
          onHome={onBack}
        />
      )}

      {winner === 'draw' && (
        <WinOverlay
          title="DRAW!"
          subtitle="Stalemate"
          onNewGame={() => setGs(null)}
          onHome={onBack}
        />
      )}

      {menuOpen && (
        <div className="game-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="game-menu-panel" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(false)}>Resume</button>
            <button onClick={() => { setGs(null); setSelected(null); setMenuOpen(false); }}>New Game</button>
            {onBack && <button onClick={onBack}>Back to Library</button>}
          </div>
        </div>
      )}
    </div>
  );
}

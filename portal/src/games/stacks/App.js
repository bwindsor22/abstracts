import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import WinOverlay from '../../components/WinOverlay';
import Scene from './Scene';
import {
  initState, SIZE,
  canPlace, applyPlace,
  canPickUp, getValidMoveSquares, applyMoveStack,
  cellIdx,
} from './Game';
import { getAIMove } from './AI/ai';

const PLACE_TYPES = [
  { type: 'flat',  label: 'Flat',     title: 'Flat stone (counts toward roads)' },
  { type: 'stand', label: 'Standing', title: 'Standing stone (wall — blocks movement)' },
  { type: 'cap',   label: 'Capstone', title: 'Capstone (always counts toward roads; can flatten walls)' },
];

// ── Start screen ───────────────────────────────────────────────────────────────
function StartScreen({ onStart }) {
  const [vsAI, setVsAI] = useState(true);
  const [difficulty, setDifficulty] = useState('medium');

  return (
    <div className="start-overlay">
      <div className="start-box">
        <div className="start-title">STACKS</div>
        <div className="start-sub">Build a road across the board to win</div>
        <div className="start-rules">
          <div>Place flat stones to build roads</div>
          <div>Standing stones block — capstones crush walls</div>
          <div>Move stacks to control the board</div>
          <div>First 2 turns: place your opponent's stone</div>
        </div>
        <div className="start-option">
          <label>
            <input type="checkbox" checked={vsAI} onChange={e => setVsAI(e.target.checked)} />
            &nbsp;Play vs AI (Player 2)
          </label>
        </div>
        {vsAI && (
          <div className="start-option">
            <span>Difficulty: </span>
            {['easy', 'medium', 'hard'].map(d => (
              <button key={d} className={`diff-btn ${difficulty === d ? 'active' : ''}`}
                onClick={() => setDifficulty(d)}>{d}</button>
            ))}
          </div>
        )}
        <button className="start-play-btn" onClick={() => onStart({ vsAI, difficulty })}>
          Play
        </button>
      </div>
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────────
export default function App({ onBack, onResult }) {
  const [opts, setOpts]           = useState(null);  // null = show start screen
  const [game, setGame]           = useState(null);
  const [mode, setMode]           = useState('idle');
  const [placeType, setPlaceType] = useState('flat');
  const [selected, setSelected]   = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [carryCount, setCarryCount] = useState(1);
  const [menuOpen, setMenuOpen]   = useState(false);
  const resultReported = useRef(false);

  const handleStart = useCallback((options) => {
    setOpts(options);
    setGame(initState(SIZE));
    setMode('idle');
    setSelected(null);
    setValidMoves([]);
    setCarryCount(1);
    setPlaceType('flat');
    resultReported.current = false;
  }, []);

  const isAITurn = game && opts?.vsAI && game.currentPlayer === 'p2' && !game.winner;

  // ── Report result ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!game?.winner || resultReported.current) return;
    resultReported.current = true;
    onResult?.({
      gameId: 'stacks',
      gameName: 'Stacks',
      won: game.winner === 'p1',
      moves: game.turn,
      difficulty: opts?.difficulty || 'medium',
    });
  }, [game?.winner, onResult, opts]);

  // ── AI turn ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAITurn) return;
    const timer = setTimeout(() => {
      const move = getAIMove(game, 'p2', opts.difficulty);
      if (!move) return;
      if (move.kind === 'place') {
        setGame(g => applyPlace(g, move.r, move.c, move.type));
      } else {
        setGame(g => applyMoveStack(g, move.fromR, move.fromC, move.count, move.toR, move.toC));
      }
      setMode('idle');
      setSelected(null);
      setValidMoves([]);
      setCarryCount(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [isAITurn, game, opts]);

  const supply   = game ? game.supply[game.currentPlayer] : { flat: 0, cap: 0 };
  const isSwap   = game ? game.turn <= 2 : false;

  const maxCarry = selected && game
    ? Math.min(game.size, game.board[cellIdx(selected.r, selected.c, game.size)].length)
    : 1;

  // ── Handle cell click ──────────────────────────────────────────────────────
  const handleCellClick = useCallback((r, c) => {
    if (!game || game.winner || isAITurn) return;

    if (mode === 'placing' || isSwap) {
      if (canPlace(game, r, c)) {
        setGame(applyPlace(game, r, c, placeType));
        setMode('idle');
        setSelected(null);
        setValidMoves([]);
      }
      return;
    }

    if (mode === 'moving' && selected) {
      const isValid = validMoves.some(m => m.r === r && m.c === c);
      if (isValid) {
        setGame(applyMoveStack(game, selected.r, selected.c, carryCount, r, c));
        setMode('idle');
        setSelected(null);
        setValidMoves([]);
        setCarryCount(1);
      } else {
        setMode('idle');
        setSelected(null);
        setValidMoves([]);
      }
      return;
    }

    // In idle mode, clicking an empty cell places a flat stone directly
    if (mode === 'idle' && canPlace(game, r, c)) {
      setGame(applyPlace(game, r, c, placeType));
      setMode('idle');
      setSelected(null);
      setValidMoves([]);
    }
  }, [game, mode, placeType, selected, validMoves, carryCount, isSwap, isAITurn]);

  // ── Handle stack click ─────────────────────────────────────────────────────
  const handleStackClick = useCallback((r, c) => {
    if (!game || game.winner || isAITurn) return;

    if (mode === 'placing' || isSwap) {
      handleCellClick(r, c);
      return;
    }

    if (mode === 'moving' && selected) {
      const isValid = validMoves.some(m => m.r === r && m.c === c);
      if (isValid) {
        setGame(applyMoveStack(game, selected.r, selected.c, carryCount, r, c));
        setMode('idle');
        setSelected(null);
        setValidMoves([]);
        setCarryCount(1);
        return;
      }
    }

    if (canPickUp(game, r, c)) {
      const stackSize = game.board[cellIdx(r, c, game.size)].length;
      const carry = Math.min(game.size, stackSize);
      const moves = getValidMoveSquares(game, r, c, carry);
      setSelected({ r, c });
      setCarryCount(carry);
      setValidMoves(moves);
      setMode('moving');
    }
  }, [game, mode, selected, validMoves, carryCount, isSwap, isAITurn, handleCellClick]);

  const handleSetCarry = useCallback((n) => {
    setCarryCount(n);
    if (selected && game) {
      setValidMoves(getValidMoveSquares(game, selected.r, selected.c, n));
    }
  }, [game, selected]);

  const resetGame = () => {
    setOpts(null);
    setGame(null);
    resultReported.current = false;
    setMenuOpen(false);
  };

  // Expose automation API for playthrough script
  useEffect(() => {
    window.__stacksApi = {
      getGame: () => game,
      getMode: () => mode,
      getSelected: () => selected,
      getValidMoves: () => validMoves,
      getIsAITurn: () => isAITurn,
      getIsSwap: () => game ? game.turn <= 2 : false,
      placeFlatAt: (r, c) => {
        if (!game || game.winner) return false;
        if (canPlace(game, r, c)) {
          setGame(g => applyPlace(g, r, c, 'flat'));
          setMode('idle');
          setSelected(null);
          setValidMoves([]);
          return true;
        }
        return false;
      },
      clickCell: handleCellClick,
      clickStack: handleStackClick,
    };
  }, [game, mode, selected, validMoves, isAITurn, handleCellClick, handleStackClick]);

  if (!opts || !game) {
    return (
      <div className="game-stacks">
        <StartScreen onStart={handleStart} />
      </div>
    );
  }

  // ── Status text ────────────────────────────────────────────────────────────
  const playerLabel = game.currentPlayer === 'p1' ? 'Player 1 (cream)' : 'Player 2 (dark)';
  let statusText;
  if (game.winner) {
    const wLabel = game.winner === 'p1' ? 'Player 1 (cream)' : 'Player 2 (dark)';
    statusText = `${wLabel} wins! (${game.winReason === 'road' ? 'road' : 'flat count'})`;
  } else if (isAITurn) {
    statusText = 'AI is thinking...';
  } else if (isSwap) {
    const opponent = game.currentPlayer === 'p1' ? 'Player 2 (dark)' : 'Player 1 (cream)';
    statusText = `${playerLabel}: place ${opponent}'s flat stone anywhere`;
  } else if (mode === 'placing') {
    statusText = `${playerLabel}: click a square to place a ${placeType} stone`;
  } else if (mode === 'moving') {
    statusText = `${playerLabel}: click a highlighted square to move (carrying ${carryCount})`;
  } else {
    statusText = `${playerLabel}'s turn — place a stone or click a stack to move`;
  }

  return (
    <div className="game-stacks">
      <div className="app">
        <Scene
          gameState={game}
          selectedCell={selected}
          validMoves={validMoves}
          carryMax={maxCarry}
          carryCount={carryCount}
          onCellClick={handleCellClick}
          onStackClick={handleStackClick}
          onSetCarry={handleSetCarry}
        />

        {/* HUD overlay */}
        <div className="hud">
          <div className="hud-title">STACKS</div>
          <div className="hud-status">{statusText}</div>

          {!game.winner && !isSwap && !isAITurn && (
            <div className="hud-actions">
              {mode !== 'moving' && (
                <>
                  <div className="hud-section-label">PLACE</div>
                  <div className="place-btns">
                    {PLACE_TYPES.map(({ type, label, title }) => {
                      const disabled = type === 'cap' ? supply.cap <= 0 : supply.flat <= 0;
                      const active = mode === 'placing' && placeType === type;
                      return (
                        <button
                          key={type}
                          className={`place-btn ${active ? 'active' : ''}`}
                          title={title}
                          disabled={disabled}
                          onClick={() => {
                            setPlaceType(type);
                            setMode('placing');
                            setSelected(null);
                            setValidMoves([]);
                          }}
                        >
                          {label}
                          <span className="supply-count">
                            {type === 'cap' ? supply.cap : supply.flat}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {mode === 'moving' && (
                <button
                  className="cancel-btn"
                  onClick={() => { setMode('idle'); setSelected(null); setValidMoves([]); }}
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          {game.winner && (
            <button className="reset-btn" onClick={resetGame}>New Game</button>
          )}

          {/* Menu button */}
          <button className="menu-btn" onClick={() => setMenuOpen(true)}>MENU</button>

          {/* Supply indicators */}
          <div className="supply-panel">
            <SupplyRow label="P1" supply={game.supply.p1} active={game.currentPlayer === 'p1' && !game.winner} />
            <SupplyRow label="P2" supply={game.supply.p2} active={game.currentPlayer === 'p2' && !game.winner} />
          </div>
        </div>

        {/* Win overlay */}
        {game.winner && (
          <WinOverlay
            title={opts?.vsAI ? (game.winner === 'p1' ? 'YOU WIN!' : 'AI WINS!') : `${game.winner === 'p1' ? 'Player 1' : 'Player 2'} wins!`}
            subtitle={game.winReason === 'road' ? 'Road completed' : 'Most flat stones'}
            onNewGame={resetGame}
            onHome={onBack}
          />
        )}

        {/* Menu overlay */}
        {menuOpen && (
          <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
            <div className="menu-panel" onClick={e => e.stopPropagation()}>
              <div className="menu-title">STACKS</div>
              <button className="menu-item" onClick={() => setMenuOpen(false)}>Resume</button>
              <button className="menu-item" onClick={resetGame}>New Game</button>
              {onBack && (
                <button className="menu-item menu-item-back" onClick={() => { setMenuOpen(false); onBack(); }}>
                  Back to Library
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SupplyRow({ label, supply, active }) {
  return (
    <div className={`supply-row ${active ? 'active' : ''}`}>
      <span className="supply-label">{label}</span>
      <span className="supply-flat">{supply.flat} flat</span>
      <span className="supply-cap">{supply.cap} cap</span>
    </div>
  );
}

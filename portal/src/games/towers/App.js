import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';
import {
  SIZE, initState,
  applySetup, applySelect, applyMove, applyBuild, cancelSelect,
  getValidMoves, getValidBuilds, applyFullMove,
} from './Game';
import { getAIMove } from './AI/ai';
import Scene3D from './Scene3D';

// ── Start screen ───────────────────────────────────────────────────────────────
function StartScreen({ onStart }) {
  const [vsAI, setVsAI] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');

  return (
    <div className="start-overlay">
      <div className="start-box">
        <div className="start-title">SANTORINI</div>
        <div className="start-sub">Build towers. Climb to level 3 to win.</div>
        <div className="start-rules">
          <div>Each player has <strong>2 workers</strong> on a 5×5 grid</div>
          <div>Each turn: <strong>Move</strong> one worker (max +1 level), then <strong>Build</strong> adjacent</div>
          <div>Win by moving onto a <strong>level 3</strong> tower</div>
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
        <button className="start-btn" onClick={() => onStart({ vsAI, difficulty })}>
          Start Game
        </button>
      </div>
    </div>
  );
}

// ── Setup label per step ───────────────────────────────────────────────────────
const SETUP_LABELS = [
  'P1: place first worker',
  'P1: place second worker',
  'P2: place first worker',
  'P2: place second worker',
];

// ── App ────────────────────────────────────────────────────────────────────────
export default function App({ onBack, onResult }) {
  const [game, setGame] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const resultReported = useRef(false);

  const handleStart = useCallback((opts) => {
    resultReported.current = false;
    setGame(initState(opts));
  }, []);

  const isAITurn = game && game.vsAI && game.currentPlayer === game.aiPlayer && !game.winner;

  // ── Report result ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!game?.winner || resultReported.current) return;
    resultReported.current = true;
    // human is always p1 (aiPlayer = 'p2')
    onResult?.({
      gameId: 'towers',
      gameName: 'Santorini',
      won: game.winner === 'p1',
      moves: game.moveCount || 0,
      difficulty: game.difficulty || 'medium',
    });
  }, [game?.winner, onResult]);

  // ── AI turn (setup + play) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!game || game.winner) return;
    if (!game.vsAI || game.currentPlayer !== game.aiPlayer) return;

    const timer = setTimeout(() => {
      if (game.phase === 'setup') {
        const empty = [];
        for (let r = 0; r < SIZE; r++)
          for (let c = 0; c < SIZE; c++)
            if (!game.board[r][c].worker) empty.push({ r, c });
        if (empty.length === 0) return;
        const pick = empty[Math.floor(Math.random() * empty.length)];
        setGame(s => applySetup(s, pick.r, pick.c));
      } else {
        const move = getAIMove(game, game.aiPlayer, game.difficulty);
        if (move) setGame(s => applyFullMove(s, move));
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [game]);

  // ── Player interactions ────────────────────────────────────────────────────
  const handleCellClick = useCallback((r, c) => {
    if (!game || game.winner || isAITurn) return;

    if (game.phase === 'setup') {
      setGame(s => applySetup(s, r, c));
    } else if (game.phase === 'move') {
      setGame(s => applyMove(s, r, c));
    } else if (game.phase === 'build') {
      setGame(s => applyBuild(s, r, c));
    }
  }, [game, isAITurn]);

  const handleWorkerClick = useCallback((workerKey) => {
    if (!game || game.winner || isAITurn) return;
    if (game.phase === 'move' && game.selectedWorker !== workerKey) {
      setGame(s => { const s2 = cancelSelect(s); return applySelect(s2, workerKey); });
    } else {
      setGame(s => applySelect(s, workerKey));
    }
  }, [game, isAITurn]);

  const handleCancel = useCallback(() => {
    setGame(s => cancelSelect(s));
  }, []);

  const resetGame = () => {
    setGame(null);
    resultReported.current = false;
    setMenuOpen(false);
  };

  // Expose automation API for playthrough script
  useEffect(() => {
    window.__towerApi = {
      getGame: () => game,
      clickCell: handleCellClick,
      clickWorker: handleWorkerClick,
      getValidMoves: (wk) => game ? getValidMoves(game, wk) : [],
      getValidBuilds: () => game ? getValidBuilds(game) : [],
    };
  }, [game, handleCellClick, handleWorkerClick]);

  if (!game) {
    return (
      <div className="game-towers">
        <StartScreen onStart={handleStart} />
      </div>
    );
  }

  // ── Build highlights map (type strings for Scene3D) ────────────────────────
  const highlights = {};
  if (game.phase === 'setup') {
    for (let r = 0; r < SIZE; r++)
      for (let c = 0; c < SIZE; c++)
        if (!game.board[r][c].worker) highlights[`${r},${c}`] = 'setup';
  } else if (game.phase === 'move' && game.selectedWorker) {
    getValidMoves(game, game.selectedWorker).forEach(m => {
      highlights[`${m.r},${m.c}`] = 'move';
    });
  } else if (game.phase === 'build') {
    getValidBuilds(game).forEach(b => {
      highlights[`${b.r},${b.c}`] = 'build';
    });
  }
  if (game.selectedWorker && game.workers[game.selectedWorker]) {
    const p = game.workers[game.selectedWorker];
    highlights[`${p.r},${p.c}`] = 'sel';
  }

  // ── Status text ────────────────────────────────────────────────────────────
  const p1Label = 'P1 (cream)', p2Label = 'P2 (dark)';
  const curLabel = game.currentPlayer === 'p1' ? p1Label : p2Label;
  let statusText;
  if (game.winner) {
    const wLabel = game.winner === 'p1' ? p1Label : p2Label;
    statusText = `${wLabel} wins! ${game.winReason === 'tower' ? '(reached level 3)' : '(opponent stuck)'}`;
  } else if (game.phase === 'setup') {
    statusText = isAITurn ? 'AI is placing workers...' : SETUP_LABELS[game.setupStep];
  } else if (isAITurn) {
    statusText = 'AI is thinking...';
  } else if (game.phase === 'select') {
    statusText = `${curLabel}: click a worker to select`;
  } else if (game.phase === 'move') {
    statusText = `${curLabel}: click a highlighted square to move`;
  } else if (game.phase === 'build') {
    statusText = `${curLabel}: click a highlighted square to build`;
  }

  return (
    <div className="game-towers">
      <div className="app">
        {/* Full-screen 3D canvas */}
        <Scene3D
          game={game}
          highlights={highlights}
          onCellClick={handleCellClick}
          onWorkerClick={handleWorkerClick}
        />

        {/* HUD overlay */}
        <div className="hud">
          <div className="hud-title">SANTORINI</div>
          <div className="hud-status">{statusText}</div>

          {game.phase === 'move' && !isAITurn && (
            <button className="cancel-btn" onClick={handleCancel}>Cancel</button>
          )}

          {game.winner && (
            <button className="reset-btn" onClick={resetGame}>New Game</button>
          )}

          {/* Menu button */}
          <button className="menu-btn" onClick={() => setMenuOpen(true)}>MENU</button>

          {/* Legend */}
          <div className="legend">
            <span className="leg-item"><span className="leg-box l1-box"/>L1</span>
            <span className="leg-item"><span className="leg-box l2-box"/>L2</span>
            <span className="leg-item"><span className="leg-box l3-box"/>L3</span>
            <span className="leg-item"><span className="leg-box dome-box"/>Dome</span>
          </div>
        </div>

        {/* Menu overlay */}
        {menuOpen && (
          <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
            <div className="menu-panel" onClick={e => e.stopPropagation()}>
              <div className="menu-title-panel">SANTORINI</div>
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

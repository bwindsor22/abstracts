import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';

// ── Omweso Game Logic ───────────────────────────────────────────────────────
// 4×8 board: each player owns 2 rows of 8 pits
// board[player][row][col] — row 0 = inner (facing opponent), row 1 = outer
const COLS = 8;

function initBoard() {
  // Each player gets 32 seeds distributed: 2 seeds per pit in their 2×8 = 16 pits
  return {
    board: [
      [Array(COLS).fill(2), Array(COLS).fill(2)], // P0: inner row, outer row
      [Array(COLS).fill(2), Array(COLS).fill(2)], // P1: inner row, outer row
    ],
  };
}

function initState({ vsAI = true, difficulty = 'medium' } = {}) {
  return {
    ...initBoard(),
    currentPlayer: 0,
    winner: null,
    captured: [0, 0], // seeds captured by each player
    vsAI,
    aiPlayer: 1,
    difficulty,
    moveCount: 0,
  };
}

function cloneState(s) {
  return {
    ...s,
    board: [
      [s.board[0][0].slice(), s.board[0][1].slice()],
      [s.board[1][0].slice(), s.board[1][1].slice()],
    ],
    captured: s.captured.slice(),
  };
}

// Sowing direction: counter-clockwise around player's own 2 rows
// Inner row (row 0): left to right (col 0..7)
// Then outer row (row 1): right to left (col 7..0)
// Then back to inner row...
// Total 16 pits per player in a loop
function nextPit(row, col) {
  if (row === 0) {
    // Inner row, moving right
    if (col < COLS - 1) return [0, col + 1];
    return [1, COLS - 1]; // wrap to outer row, right end
  }
  // Outer row, moving left
  if (col > 0) return [1, col - 1];
  return [0, 0]; // wrap back to inner row, left end
}

// Execute a move: sow seeds from pit, with relay and capture
// Rules:
// 1. Pick up all seeds from chosen pit, sow counter-clockwise one per pit
// 2. Relay: if last seed lands in a pit now containing > 1 seed, pick up all and re-sow
// 3. Capture: if last seed lands in inner row (row 0) AND opposite opponent inner pit has seeds,
//    capture those opponent seeds. Turn ends immediately.
// 4. Turn ends when last seed makes a pit have exactly 1 seed (no relay, no capture)
function sow(state, player, row, col) {
  if (state.board[player][row][col] < 2) return null;
  const s = cloneState(state);
  const opp = 1 - player;
  let seeds = s.board[player][row][col];
  s.board[player][row][col] = 0;

  let r = row, c = col;

  // Sow-relay loop
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // Sow seeds one by one
    while (seeds > 0) {
      [r, c] = nextPit(r, c);
      s.board[player][r][c]++;
      seeds--;
    }

    // Check capture: last seed in inner row + opponent inner row opposite has seeds
    if (r === 0) {
      const oppCol = COLS - 1 - c;
      if (s.board[opp][0][oppCol] > 0) {
        // Capture opponent's inner row seeds at that column
        s.captured[player] += s.board[opp][0][oppCol];
        s.board[opp][0][oppCol] = 0;
        break; // turn ends after capture
      }
    }

    // Check relay: if last pit now has > 1 seed, pick up and re-sow
    if (s.board[player][r][c] > 1) {
      seeds = s.board[player][r][c];
      s.board[player][r][c] = 0;
      // continue the loop to sow again
    } else {
      break; // pit has exactly 1 seed, turn ends
    }
  }

  s.currentPlayer = opp;
  s.moveCount++;

  // Check game over: next player has no legal moves (no pit with >= 2)
  const nextHasMove = s.board[opp][0].some(v => v >= 2) || s.board[opp][1].some(v => v >= 2);
  if (!nextHasMove) {
    s.winner = player; // current player wins
  }

  return s;
}

// Animation frames: generate per-seed-drop intermediate states
function sowSteps(state, player, row, col) {
  if (state.board[player][row][col] < 2) return null;
  const s = cloneState(state);
  const opp = 1 - player;
  let seeds = s.board[player][row][col];
  s.board[player][row][col] = 0;

  const cloneBoard = () => [
    [s.board[0][0].slice(), s.board[0][1].slice()],
    [s.board[1][0].slice(), s.board[1][1].slice()],
  ];
  const frames = [{ board: cloneBoard(), captured: s.captured.slice(), highlight: null }];

  let r = row, c = col;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    while (seeds > 0) {
      [r, c] = nextPit(r, c);
      s.board[player][r][c]++;
      seeds--;
      frames.push({ board: cloneBoard(), captured: s.captured.slice(), highlight: { player, row: r, col: c } });
    }

    // Capture check
    if (r === 0) {
      const oppCol = COLS - 1 - c;
      if (s.board[opp][0][oppCol] > 0) {
        s.captured[player] += s.board[opp][0][oppCol];
        s.board[opp][0][oppCol] = 0;
        frames.push({ board: cloneBoard(), captured: s.captured.slice(), highlight: { type: 'capture', player, col: oppCol } });
        break;
      }
    }

    // Relay check
    if (s.board[player][r][c] > 1) {
      seeds = s.board[player][r][c];
      s.board[player][r][c] = 0;
      frames.push({ board: cloneBoard(), captured: s.captured.slice(), highlight: null });
    } else {
      break;
    }
  }

  return frames;
}

function getAllMoves(state, player) {
  const moves = [];
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < COLS; col++) {
      if (state.board[player][row][col] >= 2) moves.push({ row, col });
    }
  }
  return moves;
}

// ── AI ──────────────────────────────────────────────────────────────────────
function evaluate(state) {
  // AI is player 1: maximize own seeds + captures, minimize opponent's
  const p1seeds = state.board[1][0].reduce((a, b) => a + b, 0) + state.board[1][1].reduce((a, b) => a + b, 0);
  const p0seeds = state.board[0][0].reduce((a, b) => a + b, 0) + state.board[0][1].reduce((a, b) => a + b, 0);
  return (state.captured[1] - state.captured[0]) * 3 + (p1seeds - p0seeds);
}

function minimax(state, depth, alpha, beta, maximizing) {
  if (state.winner !== null || depth === 0) return { score: evaluate(state), move: null };
  const player = maximizing ? 1 : 0;
  const moves = getAllMoves(state, player);
  if (moves.length === 0) return { score: evaluate(state), move: null };

  let best = { score: maximizing ? -Infinity : Infinity, move: moves[0] };
  for (const m of moves) {
    const next = sow(state, player, m.row, m.col);
    if (!next) continue;
    const result = minimax(next, depth - 1, alpha, beta, !maximizing);
    if (maximizing) {
      if (result.score > best.score) best = { score: result.score, move: m };
      alpha = Math.max(alpha, best.score);
    } else {
      if (result.score < best.score) best = { score: result.score, move: m };
      beta = Math.min(beta, best.score);
    }
    if (beta <= alpha) break;
  }
  return best;
}

function getAIMove(state, difficulty) {
  const depths = { easy: 2, medium: 4, hard: 7 };
  const depth = depths[difficulty] || 4;
  const { move } = minimax(state, depth, -Infinity, Infinity, true);
  return move;
}

// ── Start screen ────────────────────────────────────────────────────────────
function StartScreen({ onStart, onBack }) {
  const [difficulty, setDifficulty] = useState('medium');
  return (
    <div className="omweso-start">
      <h1>LOOPS</h1>
      <p className="start-desc">A royal East African strategy game</p>
      <p className="start-rule">
        Pick a pit with 2+ seeds on your side to sow counter-clockwise.<br />
        Relay: if your last seed makes a pit with 2+, pick up and continue.<br />
        Capture when landing on your inner row opposite opponent seeds.
      </p>
      <div className="difficulty-row">
        <label>Difficulty:</label>
        {['easy', 'medium', 'hard'].map(d => (
          <button key={d} onClick={() => setDifficulty(d)}
            className={`diff-btn${difficulty === d ? ' active' : ''}`}>
            {d}
          </button>
        ))}
      </div>
      <button onClick={() => onStart({ vsAI: true, difficulty })} className="btn-primary">
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

// ── Seed rendering ──────────────────────────────────────────────────────────
function seedRng(seed) {
  let s = seed | 0;
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

function SeedCluster({ count, size }) {
  const seeds = [];
  const rng = seedRng(count * 37 + size);
  const maxShow = Math.min(count, 20);
  const rad = size * 0.36;
  const seedR = count <= 4 ? size * 0.1 : count <= 10 ? size * 0.08 : size * 0.06;
  for (let i = 0; i < maxShow; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * rad;
    const cx = size / 2 + Math.cos(angle) * dist;
    const cy = size / 2 + Math.sin(angle) * dist;
    seeds.push(
      <circle key={i} cx={cx} cy={cy} r={seedR}
        fill={`hsl(${25 + (i * 13) % 30}, 55%, ${40 + (i * 7) % 20}%)`}
        stroke="rgba(0,0,0,0.25)" strokeWidth={0.5} />
    );
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {seeds}
      {count > 0 && (
        <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="middle"
          fill="rgba(240,238,255,0.85)" fontSize={count > 9 ? 9 : 10} fontWeight="bold"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{count}</text>
      )}
    </svg>
  );
}

// ── Board component ─────────────────────────────────────────────────────────
function SowingBoard({ state, onPitClick, isPlayerTurn, animFrame }) {
  const board = animFrame ? animFrame.board : state.board;
  const hl = animFrame ? animFrame.highlight : null;
  const disabled = !!animFrame;

  const renderPit = (player, row, col, clickable) => {
    const seeds = board[player][row][col];
    const isHl = hl && !hl.type && hl.player === player && hl.row === row && hl.col === col;
    const isCaptureHl = hl && hl.type === 'capture' && (
      (hl.player !== player && hl.col === col) // opponent's pits getting captured
    );
    const canClick = clickable && !disabled && seeds >= 2;
    return (
      <button
        key={`${row}-${col}`}
        className={`pit${canClick ? ' active' : ''}${isHl || isCaptureHl ? ' pit-highlight' : ''}${isCaptureHl ? ' pit-capture' : ''}`}
        disabled={!canClick}
        onClick={() => canClick && onPitClick(row, col)}
      >
        <SeedCluster count={seeds} size={38} />
      </button>
    );
  };

  // Board layout: 4 rows of 8
  // Top: AI outer (row 1), AI inner (row 0) — both reversed for visual mirroring
  // Bottom: Player inner (row 0), Player outer (row 1)
  return (
    <div className="omweso-board">
      <div className="board-label">AI</div>
      <div className="board-grid">
        {/* AI outer row (row 1) — displayed reversed */}
        <div className="pit-row">
          {Array.from({ length: COLS }, (_, c) => renderPit(1, 1, COLS - 1 - c, false))}
        </div>
        {/* AI inner row (row 0) — displayed reversed */}
        <div className="pit-row">
          {Array.from({ length: COLS }, (_, c) => renderPit(1, 0, COLS - 1 - c, false))}
        </div>
        <div className="board-divider" />
        {/* Player inner row (row 0) */}
        <div className="pit-row">
          {Array.from({ length: COLS }, (_, c) => renderPit(0, 0, c, isPlayerTurn))}
        </div>
        {/* Player outer row (row 1) */}
        <div className="pit-row">
          {Array.from({ length: COLS }, (_, c) => renderPit(0, 1, c, isPlayerTurn))}
        </div>
      </div>
      <div className="board-label">You</div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────
function snapshot(s) {
  return {
    board: [[s.board[0][0].slice(), s.board[0][1].slice()], [s.board[1][0].slice(), s.board[1][1].slice()]],
    captured: s.captured.slice(),
    currentPlayer: s.currentPlayer,
  };
}

export default function App({ onBack, onResult }) {
  const [state, setState] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [animFrame, setAnimFrame] = useState(null);
  const resultReported = useRef(false);
  const snapshots = useRef([]);
  const animating = useRef(false);

  const handleStart = useCallback((opts) => {
    const s = initState(opts);
    snapshots.current = [snapshot(s)];
    setState(s);
    setAnimFrame(null);
    animating.current = false;
    resultReported.current = false;
  }, []);

  const animateSow = useCallback((frames, finalState) => {
    animating.current = true;
    let i = 0;
    setAnimFrame(frames[0]);
    function step() {
      i++;
      if (i >= frames.length) {
        setAnimFrame(null);
        animating.current = false;
        setState(finalState);
        snapshots.current.push(snapshot(finalState));
        return;
      }
      setAnimFrame(frames[i]);
      setTimeout(step, 100);
    }
    setTimeout(step, 100);
  }, []);

  const handlePitClick = useCallback((row, col) => {
    if (animating.current) return;
    setState(s => {
      if (!s || s.winner !== null || s.currentPlayer !== 0) return s;
      const frames = sowSteps(s, 0, row, col);
      if (!frames) return s;
      const finalState = sow(s, 0, row, col);
      if (!finalState) return s;
      animateSow(frames, finalState);
      return s;
    });
  }, [animateSow]);

  // AI turn
  useEffect(() => {
    if (!state || state.winner !== null || state.currentPlayer !== state.aiPlayer || animating.current) return;
    const timer = setTimeout(() => {
      const move = getAIMove(state, state.difficulty);
      if (!move) return;
      const frames = sowSteps(state, state.aiPlayer, move.row, move.col);
      const finalState = sow(state, state.aiPlayer, move.row, move.col);
      if (!frames || !finalState) return;
      animateSow(frames, finalState);
    }, 400);
    return () => clearTimeout(timer);
  }, [state, animateSow]);

  // Report result
  useEffect(() => {
    if (!state || state.winner === null || resultReported.current) return;
    resultReported.current = true;
    onResult?.({
      gameId: 'omweso',
      gameName: 'Loops',
      won: state.winner === 0,
      moves: state.moveCount,
      difficulty: state.difficulty,
      snapshots: snapshots.current,
    });
  }, [state?.winner, onResult]);

  if (!state) {
    return (
      <div className="game-omweso">
        <StartScreen onStart={handleStart} onBack={onBack} />
      </div>
    );
  }

  const { currentPlayer, winner, captured } = state;
  const isPlayerTurn = !winner && currentPlayer === 0;

  const p0total = state.board[0][0].reduce((a, b) => a + b, 0) + state.board[0][1].reduce((a, b) => a + b, 0);
  const p1total = state.board[1][0].reduce((a, b) => a + b, 0) + state.board[1][1].reduce((a, b) => a + b, 0);

  const statusMsg = winner !== null
    ? (winner === 'draw' ? 'DRAW!' : winner === 0 ? 'YOU WIN!' : 'AI WINS!')
    : currentPlayer === 1 ? 'AI thinking...' : 'Your turn — pick a pit with 2+ seeds';

  return (
    <div className="game-omweso">
      <div className="omweso-layout">
        <div className="status-bar" style={{ color: winner !== null ? '#ffe066' : '#f0eeff' }}>
          {statusMsg}
        </div>

        <SowingBoard state={state} onPitClick={handlePitClick} isPlayerTurn={isPlayerTurn} animFrame={animFrame} />

        <div className="score-summary">
          <span>You: <b>{p0total}</b> seeds · <b>{captured[0]}</b> captured</span>
          <span>AI: <b>{p1total}</b> seeds · <b>{captured[1]}</b> captured</span>
        </div>

        <div className="game-controls">
          <button className="ctrl-btn" onClick={() => setMenuOpen(true)}>MENU</button>
        </div>
      </div>

      {winner !== null && (
        <div className="winner-overlay">
          <div className="winner-banner">
            <div className="winner-label">{winner === 0 ? 'YOU WIN!' : winner === 'draw' ? 'DRAW!' : 'AI WINS!'}</div>
            <div className="winner-reason">
              Captured: You {captured[0]} — AI {captured[1]}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button className="ctrl-btn" onClick={() => { handleStart({ vsAI: true, difficulty: state.difficulty }); }}>New Game</button>
              {onBack && <button className="ctrl-btn" onClick={onBack}>Home</button>}
            </div>
          </div>
        </div>
      )}

      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="menu-panel" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(false)}>Resume</button>
            <button onClick={() => { setState(null); setMenuOpen(false); }}>New Game</button>
            {onBack && <button onClick={onBack}>Back to Library</button>}
          </div>
        </div>
      )}
    </div>
  );
}

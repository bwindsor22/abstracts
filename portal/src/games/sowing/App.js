import React, { useState, useCallback, useEffect, useRef } from 'react';
import './App.css';

// ── Oware Game Logic ────────────────────────────────────────────────────────
// 2×6 board: Player A owns bottom row (pits 0-5), Player B owns top row (pits 6-11)
// Board indexed: bottom [0,1,2,3,4,5], top [11,10,9,8,7,6] (displayed reversed)
const PITS = 12;
const HALF = 6;

function initState({ vsAI = true, difficulty = 'medium' } = {}) {
  return {
    board: Array(PITS).fill(4), // 4 seeds per pit
    currentPlayer: 0, // 0 = Player A (bottom), 1 = Player B (top)
    scores: [0, 0],
    winner: null,
    vsAI,
    aiPlayer: 1,
    difficulty,
    moveCount: 0,
  };
}

function cloneState(s) {
  return { ...s, board: s.board.slice(), scores: s.scores.slice() };
}

function playerPits(player) {
  return player === 0 ? [0,1,2,3,4,5] : [6,7,8,9,10,11];
}

function opponentPits(player) {
  return player === 0 ? [6,7,8,9,10,11] : [0,1,2,3,4,5];
}

// Check if opponent has any seeds
function opponentHasSeeds(board, player) {
  return opponentPits(player).some(i => board[i] > 0);
}

// Check if a move would feed the opponent (leave them with > 0 seeds)
function moveFeeds(state, player, pit) {
  const s = cloneState(state);
  let seeds = s.board[pit];
  s.board[pit] = 0;
  let pos = pit;
  while (seeds > 0) {
    pos = (pos + 1) % PITS;
    if (pos === pit) continue; // skip origin
    s.board[pos]++;
    seeds--;
  }
  // Apply captures to see remaining state
  const oppPits = opponentPits(player);
  let p = pos;
  while (oppPits.includes(p) && (s.board[p] === 2 || s.board[p] === 3)) {
    s.board[p] = 0;
    p = (p - 1 + PITS) % PITS;
  }
  return oppPits.some(i => s.board[i] > 0);
}

function getLegalMoves(state, player) {
  const pits = playerPits(player);
  const movable = pits.filter(i => state.board[i] > 0);
  if (movable.length === 0) return [];

  // If opponent has seeds, any non-empty pit is legal
  if (opponentHasSeeds(state.board, player)) {
    // But if a move would starve opponent, only allow it if ALL moves starve
    const feeding = movable.filter(pit => moveFeeds(state, player, pit));
    if (feeding.length > 0) return feeding;
    return movable; // all moves starve, so all are allowed
  }

  // Opponent has no seeds — must feed if possible
  const feeding = movable.filter(pit => moveFeeds(state, player, pit));
  if (feeding.length > 0) return feeding;
  return []; // can't feed → no legal moves → game ends
}

function applyMove(state, pit) {
  const player = state.currentPlayer;
  const legal = getLegalMoves(state, player);
  if (!legal.includes(pit)) return null;

  const s = cloneState(state);
  let seeds = s.board[pit];
  s.board[pit] = 0;
  let pos = pit;

  // Sow counter-clockwise (increasing index), skip origin
  while (seeds > 0) {
    pos = (pos + 1) % PITS;
    if (pos === pit) continue;
    s.board[pos]++;
    seeds--;
  }

  // Capture: if last seed lands in opponent's row and pit now has 2 or 3
  const oppPits = opponentPits(player);
  if (oppPits.includes(pos) && (s.board[pos] === 2 || s.board[pos] === 3)) {
    // Capture backward chain
    let p = pos;
    while (oppPits.includes(p) && (s.board[p] === 2 || s.board[p] === 3)) {
      s.scores[player] += s.board[p];
      s.board[p] = 0;
      p = (p - 1 + PITS) % PITS;
    }
  }

  const opp = 1 - player;
  s.currentPlayer = opp;
  s.moveCount++;

  // Check game end
  const oppLegal = getLegalMoves(s, opp);
  if (oppLegal.length === 0) {
    // Remaining seeds go to their owner
    for (let i = 0; i < PITS; i++) {
      const owner = i < HALF ? 0 : 1;
      s.scores[owner] += s.board[i];
      s.board[i] = 0;
    }
    if (s.scores[0] > s.scores[1]) s.winner = 0;
    else if (s.scores[1] > s.scores[0]) s.winner = 1;
    else s.winner = 'draw';
  }

  return s;
}

// Animation frames
function sowSteps(state, pit) {
  const player = state.currentPlayer;
  const legal = getLegalMoves(state, player);
  if (!legal.includes(pit)) return null;

  const s = cloneState(state);
  let seeds = s.board[pit];
  s.board[pit] = 0;
  let pos = pit;

  const frames = [{ board: s.board.slice(), scores: s.scores.slice(), highlight: null }];

  while (seeds > 0) {
    pos = (pos + 1) % PITS;
    if (pos === pit) continue;
    s.board[pos]++;
    seeds--;
    frames.push({ board: s.board.slice(), scores: s.scores.slice(), highlight: pos });
  }

  // Capture
  const oppPits = opponentPits(player);
  if (oppPits.includes(pos) && (s.board[pos] === 2 || s.board[pos] === 3)) {
    let p = pos;
    while (oppPits.includes(p) && (s.board[p] === 2 || s.board[p] === 3)) {
      s.scores[player] += s.board[p];
      s.board[p] = 0;
      p = (p - 1 + PITS) % PITS;
    }
    frames.push({ board: s.board.slice(), scores: s.scores.slice(), highlight: 'capture' });
  }

  return frames;
}

// ── AI ──────────────────────────────────────────────────────────────────────
function evaluate(state) {
  return (state.scores[1] - state.scores[0]) * 3;
}

function minimax(state, depth, alpha, beta, maximizing) {
  if (state.winner !== null || depth === 0) return { score: evaluate(state), move: null };
  const player = maximizing ? 1 : 0;
  const moves = getLegalMoves(state, player);
  if (moves.length === 0) return { score: evaluate(state), move: null };

  let best = { score: maximizing ? -Infinity : Infinity, move: moves[0] };
  for (const pit of moves) {
    const fakeState = { ...cloneState(state), currentPlayer: player };
    const next = applyMove(fakeState, pit);
    if (!next) continue;
    const result = minimax(next, depth - 1, alpha, beta, !maximizing);
    if (maximizing) {
      if (result.score > best.score) best = { score: result.score, move: pit };
      alpha = Math.max(alpha, best.score);
    } else {
      if (result.score < best.score) best = { score: result.score, move: pit };
      beta = Math.min(beta, best.score);
    }
    if (beta <= alpha) break;
  }
  return best;
}

function getAIMove(state, difficulty) {
  const depths = { easy: 2, medium: 5, hard: 9 };
  const depth = depths[difficulty] || 5;
  const { move } = minimax(state, depth, -Infinity, Infinity, true);
  return move;
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

// ── Start screen ────────────────────────────────────────────────────────────
function StartScreen({ onStart, onBack }) {
  const [difficulty, setDifficulty] = useState('medium');
  return (
    <div className="sowing-start">
      <h1>SOWING</h1>
      <p className="start-desc">A classical West African Mancala game</p>
      <p className="start-rule">
        Sow seeds counter-clockwise from any pit on your side.<br />
        Capture when your last seed makes an opponent pit have 2 or 3 seeds.<br />
        You must feed your opponent if you can.
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

// ── Board component ─────────────────────────────────────────────────────────
function OwareBoard({ state, onPitClick, isPlayerTurn, animFrame }) {
  const board = animFrame ? animFrame.board : state.board;
  const highlight = animFrame ? animFrame.highlight : null;
  const disabled = !!animFrame;
  const legal = isPlayerTurn && !disabled ? getLegalMoves(state, 0) : [];
  const legalSet = new Set(legal);

  const renderPit = (pit, clickable) => {
    const seeds = board[pit];
    const isHl = highlight === pit;
    const canClick = clickable && legalSet.has(pit);
    return (
      <button
        key={pit}
        className={`oware-pit${canClick ? ' active' : ''}${isHl ? ' pit-highlight' : ''}`}
        disabled={!canClick}
        onClick={() => canClick && onPitClick(pit)}
      >
        <SeedCluster count={seeds} size={48} />
      </button>
    );
  };

  return (
    <div className="oware-board">
      <div className="oware-store">
        <div className="oware-store-label">AI</div>
        <div className="oware-store-count">{animFrame ? animFrame.scores[1] : state.scores[1]}</div>
      </div>
      <div className="oware-rows">
        {/* Top row: AI pits 11,10,9,8,7,6 (displayed right to left) */}
        <div className="oware-pit-row">
          {[11,10,9,8,7,6].map(pit => renderPit(pit, false))}
        </div>
        {/* Bottom row: Player pits 0,1,2,3,4,5 */}
        <div className="oware-pit-row">
          {[0,1,2,3,4,5].map(pit => renderPit(pit, isPlayerTurn))}
        </div>
      </div>
      <div className="oware-store">
        <div className="oware-store-label">You</div>
        <div className="oware-store-count">{animFrame ? animFrame.scores[0] : state.scores[0]}</div>
      </div>
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────────────────
export default function App({ onBack, onResult }) {
  const [state, setState] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [animFrame, setAnimFrame] = useState(null);
  const resultReported = useRef(false);
  const animating = useRef(false);

  const handleStart = useCallback((opts) => {
    setState(initState(opts));
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
        return;
      }
      setAnimFrame(frames[i]);
      setTimeout(step, 120);
    }
    setTimeout(step, 120);
  }, []);

  const handlePitClick = useCallback((pit) => {
    if (animating.current) return;
    setState(s => {
      if (!s || s.winner !== null || s.currentPlayer !== 0) return s;
      const frames = sowSteps(s, pit);
      if (!frames) return s;
      const finalState = applyMove(s, pit);
      if (!finalState) return s;
      animateSow(frames, finalState);
      return s;
    });
  }, [animateSow]);

  // AI turn
  useEffect(() => {
    if (!state || state.winner !== null || state.currentPlayer !== state.aiPlayer || animating.current) return;
    const timer = setTimeout(() => {
      const pit = getAIMove(state, state.difficulty);
      if (pit === null || pit === undefined) return;
      const frames = sowSteps(state, pit);
      const finalState = applyMove(state, pit);
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
      gameId: 'sowing',
      gameName: 'Sowing',
      won: state.winner === 0,
      moves: state.moveCount,
      difficulty: state.difficulty,
    });
  }, [state?.winner, onResult]);

  if (!state) {
    return (
      <div className="game-sowing">
        <StartScreen onStart={handleStart} onBack={onBack} />
      </div>
    );
  }

  const { currentPlayer, winner, scores } = state;
  const isPlayerTurn = !winner && currentPlayer === 0;

  const statusMsg = winner !== null
    ? (winner === 'draw' ? 'DRAW!' : winner === 0 ? 'YOU WIN!' : 'AI WINS!')
    : currentPlayer === 1 ? 'AI thinking...' : 'Your turn — pick a pit';

  return (
    <div className="game-sowing">
      <div className="sowing-layout">
        <div className="status-bar" style={{ color: winner !== null ? '#ffe066' : '#f0eeff' }}>
          {statusMsg}
        </div>

        <OwareBoard state={state} onPitClick={handlePitClick} isPlayerTurn={isPlayerTurn} animFrame={animFrame} />

        <div className="game-controls">
          <button className="ctrl-btn" onClick={() => setMenuOpen(true)}>MENU</button>
        </div>
      </div>

      {winner !== null && (
        <div className="winner-overlay">
          <div className="winner-banner">
            <div className="winner-label">{winner === 0 ? 'YOU WIN!' : winner === 'draw' ? 'DRAW!' : 'AI WINS!'}</div>
            <div className="winner-reason">
              You {scores[0]} — AI {scores[1]}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
              <button className="ctrl-btn" onClick={() => handleStart({ vsAI: true, difficulty: state.difficulty })}>New Game</button>
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

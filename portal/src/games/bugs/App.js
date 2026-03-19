import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import './App.css';
import WinOverlay from '../../components/WinOverlay';
import {
  initState, getAllMoves, applyMove, getPlacementCells,
  key, parseKey, topPiece
} from './Game';
import { getAIMove } from './AI/ai';
import { useDrag, useDrop, useDragLayer } from 'react-dnd';

const BG = '#191022';
const HEX_SIZE = 36;
const ITEM_HAND = 'HAND_PIECE';
const ITEM_BOARD = 'BOARD_PIECE';

const MOVEMENT_GUIDE = [
  { type: 'Q', name: 'Queen', color: '#FFD700', desc: 'Moves 1 space. Must be placed by move 4. Surround to win.' },
  { type: 'A', name: 'Ant', color: '#3498DB', desc: 'Moves any distance around the hive perimeter.' },
  { type: 'G', name: 'Grasshopper', color: '#2ECC71', desc: 'Jumps in a straight line over adjacent pieces.' },
  { type: 'S', name: 'Spider', color: '#E67E22', desc: 'Moves exactly 3 spaces around the hive.' },
  { type: 'B', name: 'Beetle', color: '#9B59B6', desc: 'Moves 1 space. Can climb on top of other pieces.' },
];


function hexToPixel(q, r) {
  const x = HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = HEX_SIZE * (3 / 2 * r);
  return { x, y };
}

function hexCorners(cx, cy, size) {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = Math.PI / 180 * (60 * i - 30);
    return `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`;
  }).join(' ');
}

const PIECE_COLORS = {
  queen: '#FFD700', beetle: '#9B59B6', grasshopper: '#2ECC71',
  spider: '#E67E22', ant: '#3498DB',
};
const PIECE_LABELS = { queen: 'Q', beetle: 'B', grasshopper: 'G', spider: 'S', ant: 'A' };
const PLAYER_COLORS = { black: '#222', white: '#f5f5f5' };

function StartScreen({ onStart, onBack }) {
  const [vsAI, setVsAI] = useState(true);
  const [difficulty, setDifficulty] = useState('medium');
  return (
    <div style={{ textAlign: 'center', padding: 40, maxWidth: 420, margin: '0 auto' }}>
      <h1 style={{ color: '#c8b8e8', marginBottom: 8 }}>BUGS</h1>
      <p style={{ color: '#8a7ab0', marginBottom: 6 }}>Surround the opponent's Queen Bee to win</p>
      <p style={{ color: '#7a6ab0', fontSize: 13, marginBottom: 24 }}>
        Place and move pieces. The Queen must be placed by move 4.<br />
        Surround all 6 neighbours of the opponent's Queen to win.
      </p>
      <div style={{ marginBottom: 16 }}>
        <label style={{ color: '#c8b8e8' }}>
          <input type="checkbox" checked={vsAI} onChange={e => setVsAI(e.target.checked)} style={{ marginRight: 8 }} />
          Play vs AI (White)
        </label>
      </div>
      {vsAI && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: '#8a7ab0', marginRight: 8 }}>Difficulty:</label>
          {['easy', 'medium', 'hard'].map(d => (
            <button key={d} onClick={() => setDifficulty(d)}
              style={{ margin: '0 4px', padding: '4px 12px', background: difficulty === d ? '#5a3a8a' : BG, color: '#c8b8e8', border: '1px solid #5a3a8a', borderRadius: 4, cursor: 'pointer' }}>
              {d}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 8 }}>
        <button onClick={() => onStart({ vsAI, difficulty })}
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

// ── Draggable hand piece ──────────────────────────────────────────────────────
// item must be a plain object in react-dnd v10 (not a factory function)
function DraggableHandPiece({ pid, type, player, isCurrentHand, isSelected, onHandClick, mustPlayQueen }) {
  const canUse = isCurrentHand && (!mustPlayQueen || type === 'queen');
  const [{ isDragging }, drag] = useDrag({
    item: { type: ITEM_HAND, pieceId: pid, pieceType: type, player },
    canDrag: () => canUse,
    collect: m => ({ isDragging: m.isDragging() }),
  });

  return (
    <div ref={drag}
      onClick={() => canUse && onHandClick(pid, type)}
      style={{
        width: 38, height: 38, borderRadius: '50%',
        background: PLAYER_COLORS[player],
        border: `2px solid ${isSelected ? '#ffe066' : PIECE_COLORS[type]}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: canUse ? (isDragging ? 'grabbing' : 'grab') : 'default',
        opacity: isDragging ? 0.35 : (canUse ? 1 : 0.3),
        color: PIECE_COLORS[type], fontWeight: 'bold', fontSize: 14,
        userSelect: 'none',
      }}>
      {PIECE_LABELS[type]}
    </div>
  );
}

// ── Drop target overlay for a hex position (HTML div, absolutely positioned) ──
// Accepts hand pieces and board pieces. canDrop validates the specific item.
// Shows green when canDrop + hovered, red when hovered but invalid.
function HexDropOverlay({ q, r, offsetX, offsetY, placementCells, moveMap, onDrop, onHexClick, active, mustPlayQueen }) {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: [ITEM_HAND, ITEM_BOARD],
    canDrop: (item) => {
      if (item.type === ITEM_HAND) {
        if (mustPlayQueen && item.pieceType !== 'queen') return false;
        return placementCells.some(([hq, hr]) => hq === q && hr === r);
      }
      if (item.type === ITEM_BOARD) {
        const dests = moveMap[item.boardKey] || [];
        return dests.some(([dq, dr]) => dq === q && dr === r);
      }
      return false;
    },
    drop: (item) => { onDrop(q, r, item); },
    collect: m => ({ isOver: m.isOver(), canDrop: m.canDrop() }),
  });

  const { x, y } = hexToPixel(q, r);
  const sz = HEX_SIZE + 4;
  const isValidTarget = placementCells.some(([hq, hr]) => hq === q && hr === r) ||
    Object.values(moveMap).some(dests => dests.some(([dq, dr]) => dq === q && dr === r));

  return (
    <div ref={drop}
      onClick={() => onHexClick(q, r)}
      style={{
        position: 'absolute',
        left: x + offsetX - sz,
        top: y + offsetY - sz,
        width: sz * 2,
        height: sz * 2,
        borderRadius: '50%',
        background: isOver && canDrop ? 'rgba(0,200,50,0.5)'
          : isOver && !canDrop ? 'rgba(255,50,50,0.4)'
          : 'transparent',
        border: `2px solid ${isOver && canDrop ? 'rgba(0,255,80,0.9)'
          : isOver ? 'rgba(255,50,50,0.7)'
          : isValidTarget && active ? 'rgba(255,230,0,0.3)'
          : 'transparent'}`,
        boxSizing: 'border-box',
        cursor: active ? 'pointer' : 'default',
        pointerEvents: active ? 'auto' : 'none',
        zIndex: 2,
        transition: 'background 0.08s',
      }}
    />
  );
}

// ── Transparent drag+click overlay for board pieces ───────────────────────────
function BoardPieceDragOverlay({ q, r, offsetX, offsetY, isCurrentPlayer, onHexClick }) {
  const [{ isDragging }, drag] = useDrag({
    item: { type: ITEM_BOARD, boardKey: key(q, r), q, r },
    canDrag: () => isCurrentPlayer,
    collect: m => ({ isDragging: m.isDragging() }),
  });

  const { x, y } = hexToPixel(q, r);
  const sz = HEX_SIZE + 4;

  return (
    <div ref={drag}
      onClick={() => onHexClick(q, r)}
      style={{
        position: 'absolute',
        left: x + offsetX - sz,
        top: y + offsetY - sz,
        width: sz * 2,
        height: sz * 2,
        borderRadius: '50%',
        background: isDragging ? 'rgba(0,0,0,0.25)' : 'transparent',
        cursor: isCurrentPlayer ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
        pointerEvents: 'auto',
        zIndex: 1,
        boxSizing: 'border-box',
      }}
    />
  );
}

// ── GameBoard: SVG (visuals) + HTML overlays (DnD interaction) ────────────────
function GameBoard({ gs, selected, highlights, handleHexClick, handleHandClick, handleDrop }) {
  const { board, hand, currentPlayer, winner, vsAI, aiPlayer } = gs;

  const canPlay = !winner && !(vsAI && currentPlayer === aiPlayer);
  const mustPlayQueen = gs.moveNumber >= 6 && !gs.queenPlaced[currentPlayer];

  // Pre-compute all potential drop targets for DnD (independent of click selection)
  const { placementCells, moveMap, allTargets } = useMemo(() => {
    if (!canPlay) return { placementCells: [], moveMap: {}, allTargets: [] };
    const pc = getPlacementCells(gs, currentPlayer);
    const allMoves = getAllMoves(gs, currentPlayer);
    const mm = {};
    for (const m of allMoves) {
      if (m.type === 'move') {
        if (!mm[m.fromKey]) mm[m.fromKey] = [];
        mm[m.fromKey].push([m.q, m.r]);
      }
    }
    const targetSet = new Set();
    for (const [q, r] of pc) targetSet.add(key(q, r));
    for (const dests of Object.values(mm))
      for (const [q, r] of dests) targetSet.add(key(q, r));
    return { placementCells: pc, moveMap: mm, allTargets: [...targetSet].map(parseKey) };
  }, [gs, canPlay, currentPlayer]);

  // Know when a drag is in progress (to activate overlays)
  const { isDragging } = useDragLayer(m => ({ isDragging: m.isDragging() }));

  // Board bounds
  const boardKeys = Object.keys(board).filter(k => board[k]?.length > 0);
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  if (boardKeys.length > 0) {
    const pts = boardKeys.map(k => { const [q, r] = parseKey(k); return hexToPixel(q, r); });
    minX = Math.min(...pts.map(p => p.x)) - HEX_SIZE * 2;
    maxX = Math.max(...pts.map(p => p.x)) + HEX_SIZE * 2;
    minY = Math.min(...pts.map(p => p.y)) - HEX_SIZE * 2;
    maxY = Math.max(...pts.map(p => p.y)) + HEX_SIZE * 2;
  } else {
    minX = -HEX_SIZE * 4; maxX = HEX_SIZE * 4;
    minY = -HEX_SIZE * 4; maxY = HEX_SIZE * 4;
  }
  for (const [hq, hr] of highlights) {
    const { x, y } = hexToPixel(hq, hr);
    minX = Math.min(minX, x - HEX_SIZE * 2); maxX = Math.max(maxX, x + HEX_SIZE * 2);
    minY = Math.min(minY, y - HEX_SIZE * 2); maxY = Math.max(maxY, y + HEX_SIZE * 2);
  }
  // Note: allTargets (all potential move destinations) intentionally excluded from bounds —
  // they can be very far from the hive (e.g. ant moves), which would make the SVG too large.
  // Only highlights (selected piece's valid moves) expand the view.
  if (boardKeys.length === 0) {
    minX = -HEX_SIZE * 6; maxX = HEX_SIZE * 6;
    minY = -HEX_SIZE * 4; maxY = HEX_SIZE * 4;
  }

  const PAD = 20;
  const viewWidth = Math.max(maxX - minX + PAD * 2, 300);
  const viewHeight = Math.max(maxY - minY + PAD * 2, 200);
  const offsetX = -minX + PAD;
  const offsetY = -minY + PAD;

  const highlightSet = new Set(highlights.map(([hq, hr]) => key(hq, hr)));

  const statusMsg = winner === 'draw' ? 'DRAW — Both queens surrounded!'
    : winner ? `${winner.toUpperCase()} WINS!`
    : vsAI && currentPlayer === aiPlayer ? 'AI thinking...'
    : mustPlayQueen ? `${currentPlayer.toUpperCase()}'s turn — must place Queen!`
    : `${currentPlayer.toUpperCase()}'s turn`;
  const cpColor = currentPlayer === 'black' ? '#aaa' : '#eee';

  return (
    <>
      <div style={{ color: winner ? '#ffe066' : cpColor, fontSize: 18, fontWeight: 'bold' }}>{statusMsg}</div>

      {/* position:relative wrapper — SVG renders visuals, HTML divs handle DnD */}
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <svg width={viewWidth} height={viewHeight}
          style={{ display: 'block', background: '#1a1030', borderRadius: 8, border: '1px solid rgba(153,66,240,0.2)' }}>
          <g transform={`translate(${offsetX},${offsetY})`}>
            {/* Highlight polygons (for click-based interaction) */}
            {highlights.map(([hq, hr]) => {
              const { x, y } = hexToPixel(hq, hr);
              return (
                <polygon key={`hl-${hq}-${hr}`}
                  points={hexCorners(x, y, HEX_SIZE - 2)}
                  fill="rgba(255,230,0,0.18)" stroke="#ffe066" strokeWidth={1.5}
                />
              );
            })}
            {/* Board pieces */}
            {boardKeys.map(k => {
              const [q, r] = parseKey(k);
              const stack = board[k];
              const piece = stack[stack.length - 1];
              const { x, y } = hexToPixel(q, r);
              const isSelected = selected?.type === 'board' && selected.key === k;
              return (
                <g key={k}>
                  <polygon points={hexCorners(x, y, HEX_SIZE - 2)}
                    fill={PLAYER_COLORS[piece.player]}
                    stroke={isSelected ? '#ffe066' : PIECE_COLORS[piece.type]}
                    strokeWidth={isSelected ? 3 : 2} />
                  <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
                    fill={PIECE_COLORS[piece.type]} fontSize={14} fontWeight="bold" style={{ pointerEvents: 'none' }}>
                    {PIECE_LABELS[piece.type]}
                  </text>
                  {stack.length > 1 && (
                    <text x={x + HEX_SIZE * 0.5} y={y - HEX_SIZE * 0.5}
                      textAnchor="middle" dominantBaseline="middle"
                      fill="#ffe066" fontSize={10} fontWeight="bold" style={{ pointerEvents: 'none' }}>
                      {stack.length}
                    </text>
                  )}
                </g>
              );
            })}
            {/* First placement hint polygon */}
            {boardKeys.length === 0 && (
              <polygon points={hexCorners(0, 0, HEX_SIZE - 2)}
                fill="rgba(255,230,0,0.08)" stroke="#555" strokeWidth={1} strokeDasharray="4,2" />
            )}
          </g>
        </svg>

        {/* Drop target overlays — always rendered for all potential positions.
            pointer-events: auto only when a drag is in progress (or click-based highlights active).
            canDrop inside each overlay validates the specific dragged piece. */}
        {allTargets.map(([tq, tr]) => (
          <HexDropOverlay
            key={`tgt-${tq}-${tr}`}
            q={tq} r={tr}
            offsetX={offsetX} offsetY={offsetY}
            placementCells={placementCells}
            moveMap={moveMap}
            onDrop={handleDrop}
            onHexClick={handleHexClick}
            active={isDragging || highlightSet.has(key(tq, tr))}
            mustPlayQueen={mustPlayQueen}
          />
        ))}

        {/* Drag overlays for board pieces (transparent, click+drag) */}
        {canPlay && boardKeys.map(k => {
          const [q, r] = parseKey(k);
          const stack = board[k];
          const piece = stack[stack.length - 1];
          const isCurrentPlayer = piece.player === currentPlayer;
          return (
            <BoardPieceDragOverlay
              key={`drag-${k}`}
              q={q} r={r}
              offsetX={offsetX} offsetY={offsetY}
              isCurrentPlayer={isCurrentPlayer}
              onHexClick={handleHexClick}
            />
          );
        })}
      </div>

      {/* Hands */}
      <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['black', 'white'].map(player => {
          const pieces = hand[player];
          const isCurrentHand = player === currentPlayer && canPlay;
          return (
            <div key={player} style={{ textAlign: 'center' }}>
              <div style={{ color: player === 'black' ? '#aaa' : '#eee', fontSize: 12, marginBottom: 4 }}>
                {player.toUpperCase()} hand
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 240, justifyContent: 'center' }}>
                {Object.entries(pieces).map(([pid, type]) => {
                  const isSelThis = selected?.type === 'hand' && selected.pieceId === pid;
                  return (
                    <DraggableHandPiece
                      key={pid}
                      pid={pid} type={type} player={player}
                      isCurrentHand={isCurrentHand}
                      isSelected={isSelThis}
                      onHandClick={handleHandClick}
                      mustPlayQueen={isCurrentHand && mustPlayQueen}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function App({ onBack, onResult }) {
  const [gs, setGs] = useState(null);
  const [selected, setSelected] = useState(null);
  const [highlights, setHighlights] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const resultFired = useRef(false);

  const handleStart = useCallback((opts) => {
    setGs(initState({ ...opts, aiPlayer: 'white' }));
    setSelected(null); setHighlights([]);
    resultFired.current = false;
  }, []);

  const computeHighlights = useCallback((state, sel) => {
    if (!sel) return [];
    if (sel.type === 'hand') return getPlacementCells(state, state.currentPlayer);
    if (sel.type === 'board') {
      const moves = getAllMoves(state, state.currentPlayer);
      return moves.filter(m => m.type === 'move' && m.fromKey === sel.key).map(m => [m.q, m.r]);
    }
    return [];
  }, []);

  const handleHexClick = useCallback((q, r) => {
    if (!gs || gs.winner) return;
    if (gs.vsAI && gs.currentPlayer === gs.aiPlayer) return;
    const k = key(q, r);
    const top = topPiece(gs.board, q, r);

    if (selected) {
      const inHighlights = highlights.some(([hq, hr]) => hq === q && hr === r);
      if (inHighlights) {
        const move = selected.type === 'hand'
          ? { type: 'place', pieceId: selected.pieceId, pieceType: selected.pieceType, q, r }
          : { type: 'move', fromKey: selected.key, q, r };
        setGs(s => applyMove(s, move));
        setSelected(null); setHighlights([]);
        return;
      }
      if (top && top.player === gs.currentPlayer) {
        const newSel = { type: 'board', key: k };
        setSelected(newSel);
        setHighlights(computeHighlights(gs, newSel));
        return;
      }
      setSelected(null); setHighlights([]);
      return;
    }
    if (top && top.player === gs.currentPlayer) {
      const newSel = { type: 'board', key: k };
      setSelected(newSel);
      setHighlights(computeHighlights(gs, newSel));
    }
  }, [gs, selected, highlights, computeHighlights]);

  const handleHandClick = useCallback((pieceId, pieceType) => {
    if (!gs || gs.winner) return;
    if (gs.vsAI && gs.currentPlayer === gs.aiPlayer) return;
    const newSel = { type: 'hand', pieceId, pieceType };
    setSelected(newSel);
    setHighlights(computeHighlights(gs, newSel));
  }, [gs, computeHighlights]);

  // DnD drop handler — item carries piece info, no need for selected state
  const handleDrop = useCallback((q, r, item) => {
    if (!gs || gs.winner) return;
    if (gs.vsAI && gs.currentPlayer === gs.aiPlayer) return;
    const move = item.type === ITEM_HAND
      ? { type: 'place', pieceId: item.pieceId, pieceType: item.pieceType, q, r }
      : { type: 'move', fromKey: item.boardKey, q, r };
    setGs(s => applyMove(s, move));
    setSelected(null); setHighlights([]);
  }, [gs]);

  useEffect(() => {
    if (!gs || gs.winner) return;
    if (!gs.vsAI || gs.currentPlayer !== gs.aiPlayer) return;
    const timer = setTimeout(() => {
      const move = getAIMove(gs, gs.aiPlayer, gs.difficulty);
      if (move) { setGs(s => applyMove(s, move)); setSelected(null); setHighlights([]); }
    }, 400);
    return () => clearTimeout(timer);
  }, [gs]);

  // Expose automation API for playthrough script
  useEffect(() => {
    window.__bugsApi = {
      getGs: () => gs,
      getAllMoves: (player) => getAllMoves(gs, player || gs.currentPlayer),
      aiMoveForCurrent: () => {
        if (!gs || gs.winner) return 'done';
        const move = getAIMove(gs, gs.currentPlayer, 'easy');
        if (move) { setGs(s => applyMove(s, move)); setSelected(null); setHighlights([]); return 'ok'; }
        return 'no-move';
      },
    };
  }, [gs]);

  // Report result when game ends
  useEffect(() => {
    if (!gs || !gs.winner || resultFired.current) return;
    resultFired.current = true;
    if (onResult) onResult({
      gameId: 'bugs',
      gameName: 'Bugs',
      won: gs.winner === 'black',
      moves: gs.moveCount || 0,
      difficulty: gs.difficulty || 'medium',
    });
  }, [gs, onResult]);

  // Auto-pass: if the human player has no valid moves, switch turns automatically
  useEffect(() => {
    if (!gs || gs.winner) return;
    if (gs.vsAI && gs.currentPlayer === gs.aiPlayer) return;
    const moves = getAllMoves(gs, gs.currentPlayer);
    if (moves.length === 0) {
      const timer = setTimeout(() => {
        setGs(s => ({ ...s, currentPlayer: s.currentPlayer === 'black' ? 'white' : 'black' }));
        setSelected(null); setHighlights([]);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [gs]);

  if (!gs) {
    return (
      <div className="game-bugs" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <StartScreen onStart={handleStart} onBack={onBack} />
      </div>
    );
  }

  return (
      <div className="game-bugs" style={{ padding: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <GameBoard
            gs={gs}
            selected={selected}
            highlights={highlights}
            handleHexClick={handleHexClick}
            handleHandClick={handleHandClick}
            handleDrop={handleDrop}
          />
          {selected && (
            <div className="selected-hint">
              {selected.type === 'hand'
                ? `Selected: ${selected.pieceType} — click or drag to a highlighted cell`
                : `Selected piece — click or drag to a highlighted cell, or click another piece`}
            </div>
          )}

          {/* Bottom controls */}
          <div className="game-controls">
            <button className="ctrl-btn" disabled>UNDO</button>
            <button className="ctrl-btn" onClick={() => setShowGuide(g => !g)}>
              {showGuide ? 'HIDE GUIDE' : 'GUIDE'}
            </button>
            <button className="ctrl-btn" onClick={() => setMenuOpen(true)}>MENU</button>
          </div>

          {/* Movement guide */}
          {showGuide && (
            <div className="movement-guide">
              <div className="guide-title">PIECE MOVEMENT</div>
              {MOVEMENT_GUIDE.map(p => (
                <div key={p.type} className="guide-row">
                  <div className="guide-piece" style={{ background: p.color }}>{p.type}</div>
                  <div className="guide-info">
                    <div className="guide-name">{p.name}</div>
                    <div className="guide-desc">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Win overlay */}
        {gs.winner && (
          <WinOverlay
            title={gs.winner === 'draw' ? 'DRAW!' : gs.vsAI ? (gs.winner !== gs.aiPlayer ? 'YOU WIN!' : 'AI WINS!') : `${gs.winner === 'black' ? 'Black' : 'White'} wins!`}
            subtitle={gs.winner === 'draw' ? 'Both queens surrounded' : 'Queen surrounded'}
            onNewGame={() => { resultFired.current = false; setGs(null); setSelected(null); setHighlights([]); }}
            onHome={onBack}
          />
        )}

        {/* In-game menu overlay */}
        {menuOpen && (
          <div className="game-menu-overlay" onClick={() => setMenuOpen(false)}>
            <div className="game-menu-panel" onClick={e => e.stopPropagation()}>
              <button onClick={() => setMenuOpen(false)}>Resume</button>
              <button onClick={() => { resultFired.current = false; setGs(null); setSelected(null); setHighlights([]); setMenuOpen(false); }}>New Game</button>
              {onBack && <button onClick={onBack}>Back to Library</button>}
            </div>
          </div>
        )}
      </div>
  );
}

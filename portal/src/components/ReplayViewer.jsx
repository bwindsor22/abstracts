import React, { useState } from 'react';
import './ReplayViewer.css';

// ── Sowing replay board (Omweso 4×8) ────────────────────────────────────────
function SowingReplayBoard({ snap }) {
  const { board, captured } = snap;
  const COLS = 8;

  function renderPit(count) {
    const seeds = [];
    for (let i = 0; i < Math.min(count, 16); i++) {
      const angle = (i / Math.min(count, 16)) * Math.PI * 2 + i * 0.3;
      const r = count <= 3 ? 5 : count <= 8 ? 8 : 10;
      const cx = 16 + Math.cos(angle) * r * (0.5 + (i % 3) * 0.2);
      const cy = 16 + Math.sin(angle) * r * (0.5 + (i % 2) * 0.3);
      seeds.push(
        <circle key={i} cx={cx} cy={cy} r={2.5}
          fill={`hsl(${30 + i * 7}, 60%, ${45 + (i % 3) * 10}%)`}
          stroke="rgba(0,0,0,0.3)" strokeWidth={0.4} />
      );
    }
    return (
      <div className="replay-pit" style={{ width: 34, height: 34 }}>
        <svg width={34} height={34} viewBox="0 0 34 34">
          <circle cx={17} cy={17} r={15} fill="rgba(26,11,46,0.8)" stroke="rgba(153,66,240,0.25)" strokeWidth={1} />
          {count > 0 && seeds}
          {count > 0 && <text x={17} y={18} textAnchor="middle" dominantBaseline="middle" fill="rgba(240,238,255,0.8)" fontSize={8} fontWeight="bold">{count}</text>}
        </svg>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <div style={{ fontSize: 10, color: 'rgba(240,238,255,0.4)' }}>AI (captured: {captured?.[1] || 0})</div>
      <div style={{ display: 'flex', gap: 2 }}>{Array.from({length: COLS}, (_, c) => <div key={c}>{renderPit(board[1][1][COLS-1-c])}</div>)}</div>
      <div style={{ display: 'flex', gap: 2 }}>{Array.from({length: COLS}, (_, c) => <div key={c}>{renderPit(board[1][0][COLS-1-c])}</div>)}</div>
      <div style={{ height: 2, width: '100%', background: 'rgba(153,66,240,0.3)', margin: '2px 0' }} />
      <div style={{ display: 'flex', gap: 2 }}>{Array.from({length: COLS}, (_, c) => <div key={c}>{renderPit(board[0][0][c])}</div>)}</div>
      <div style={{ display: 'flex', gap: 2 }}>{Array.from({length: COLS}, (_, c) => <div key={c}>{renderPit(board[0][1][c])}</div>)}</div>
      <div style={{ fontSize: 10, color: 'rgba(240,238,255,0.4)' }}>You (captured: {captured?.[0] || 0})</div>
    </div>
  );
}

// ── Mills replay board ─────────────────────────────────────────────────────────
const MILLS_POSITIONS = [
  [0,0],[3,0],[6,0],[0,3],[6,3],[0,6],[3,6],[6,6],
  [1,1],[3,1],[5,1],[1,3],[5,3],[1,5],[3,5],[5,5],
  [2,2],[3,2],[4,2],[2,3],[4,3],[2,4],[3,4],[4,4],
];
const MILLS_LINES = [
  [0,1],[1,2],[0,3],[2,4],[3,5],[4,7],[5,6],[6,7],
  [8,9],[9,10],[8,11],[10,12],[11,13],[12,15],[13,14],[14,15],
  [16,17],[17,18],[16,19],[18,20],[19,21],[20,23],[21,22],[22,23],
  [1,9],[9,17],[3,11],[11,19],[6,14],[14,22],[4,12],[12,20],
];

function MillsReplayBoard({ snap }) {
  const { board } = snap;
  const SIZE = 280;
  const M = 24;
  const SCALE = (SIZE - 2 * M) / 6;
  const toXY = (gx, gy) => ({ x: M + gx * SCALE, y: M + gy * SCALE });

  return (
    <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ display: 'block' }}>
      {MILLS_LINES.map(([a,b], i) => {
        const p1 = toXY(...MILLS_POSITIONS[a]);
        const p2 = toXY(...MILLS_POSITIONS[b]);
        return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(153,66,240,0.3)" strokeWidth={1.5} />;
      })}
      {MILLS_POSITIONS.map(([gx,gy], i) => {
        const { x, y } = toXY(gx, gy);
        const piece = board[i];
        return (
          <circle key={i} cx={x} cy={y}
            r={piece !== null ? 10 : 4}
            fill={piece === 0 ? '#f5f5f5' : piece === 1 ? '#555' : 'rgba(42,31,69,0.8)'}
            stroke={piece === 0 ? '#ddd' : piece === 1 ? '#333' : 'rgba(153,66,240,0.25)'}
            strokeWidth={1.5}
          />
        );
      })}
    </svg>
  );
}

// ── Generic replay viewer ──────────────────────────────────────────────────────
const BOARD_RENDERERS = {
  sowing: SowingReplayBoard,
  mills: MillsReplayBoard,
};

export default function ReplayViewer({ gameId, gameName, snapshots, onClose }) {
  const [step, setStep] = useState(0);
  const BoardRenderer = BOARD_RENDERERS[gameId];

  if (!BoardRenderer || !snapshots || snapshots.length === 0) {
    return (
      <div className="replay-overlay" onClick={onClose}>
        <div className="replay-panel" onClick={e => e.stopPropagation()}>
          <p>No replay data available for this game.</p>
          <button className="replay-close" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const snap = snapshots[step];
  const total = snapshots.length;

  return (
    <div className="replay-overlay" onClick={onClose}>
      <div className="replay-panel" onClick={e => e.stopPropagation()}>
        <div className="replay-header">
          <span className="replay-title">{gameName} — Replay</span>
          <button className="replay-close" onClick={onClose}>×</button>
        </div>

        <div className="replay-board-area">
          <BoardRenderer snap={snap} />
        </div>

        <div className="replay-info">
          <span>Turn: {snap.currentPlayer === 0 ? 'You' : 'AI'}</span>
          <span>Step {step + 1} / {total}</span>
        </div>

        <div className="replay-controls">
          <button onClick={() => setStep(0)} disabled={step === 0}>⏮</button>
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>◀</button>
          <button onClick={() => setStep(s => Math.min(total - 1, s + 1))} disabled={step === total - 1}>▶</button>
          <button onClick={() => setStep(total - 1)} disabled={step === total - 1}>⏭</button>
        </div>
      </div>
    </div>
  );
}

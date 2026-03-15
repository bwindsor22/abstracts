// Scene3D.jsx — Santorini 3D board using react-three-fiber
import React, { useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

const CELL   = 2.2;   // center-to-center spacing
const TILE   = 2.0;   // tile footprint
const HALF   = 2;     // (SIZE-1)/2 = 2 for 5×5

// Building block dimensions: width and height per level
const BLOCK_W = [1.80, 1.45, 1.10]; // L1 widest → L3 narrowest
const BLOCK_H = 0.35;               // each level is this tall

// Colors
const BOARD_COLOR = '#2a1a08';
const TILE_COLORS  = ['#7a6348', '#6b5340'];  // alternating checker
const BLOCK_COLORS = ['#ddd8d0', '#b8c8d8', '#7090b8'];  // L1 stone, L2 blue-gray, L3 deep blue
const DOME_COLOR   = '#1a3060';
const P1_COLOR     = '#f0d9b5';
const P2_COLOR     = '#2d1a08';
const P1_RING      = '#c0903a';
const P2_RING      = '#c08050';

function cellXZ(r, c) {
  return [(c - HALF) * CELL, (r - HALF) * CELL];
}

// ── Single board tile + tower stack + optional highlight ─────────────────────
function TowerCell({ r, c, cell, highlight, onCellClick }) {
  const [x, z] = cellXZ(r, c);
  const { level, dome } = cell;

  // Total tower height (Y top of last block)
  const towerTopY = level * BLOCK_H;

  let hlColor = null;
  let hlOpacity = 0.55;
  if (highlight === 'move')   { hlColor = '#40c840'; hlOpacity = 0.50; }
  if (highlight === 'build')  { hlColor = '#4488ff'; hlOpacity = 0.50; }
  if (highlight === 'setup')  { hlColor = '#ffff60'; hlOpacity = 0.30; }
  if (highlight === 'sel')    { hlColor = '#ffe030'; hlOpacity = 0.60; }

  const tileColor = TILE_COLORS[(r + c) % 2];

  return (
    <group position={[x, 0, z]}>
      {/* Ground tile */}
      <mesh onClick={onCellClick}>
        <boxGeometry args={[TILE, 0.12, TILE]} />
        <meshLambertMaterial color={tileColor} />
      </mesh>

      {/* Highlight overlay (sits just above tile) */}
      {hlColor && (
        <mesh position={[0, 0.07, 0]} onClick={onCellClick}>
          <boxGeometry args={[TILE * 0.94, 0.02, TILE * 0.94]} />
          <meshLambertMaterial color={hlColor} transparent opacity={hlOpacity} />
        </mesh>
      )}

      {/* Tower blocks — stacked, getting narrower */}
      {Array.from({ length: level }, (_, i) => {
        const w = BLOCK_W[i];
        const y = 0.06 + i * BLOCK_H + BLOCK_H / 2;
        return (
          <mesh key={i} position={[0, y, 0]} onClick={onCellClick}>
            <boxGeometry args={[w, BLOCK_H, w]} />
            <meshLambertMaterial color={BLOCK_COLORS[i]} />
          </mesh>
        );
      })}

      {/* Dome (blue hemisphere on top of level-3 block) */}
      {dome && (
        <mesh position={[0, 0.06 + level * BLOCK_H + 0.22, 0]} onClick={onCellClick}>
          {/* SphereGeometry: radius, wSegs, hSegs, phiStart, phiLen, thetaStart, thetaLen */}
          <sphereGeometry args={[0.50, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshLambertMaterial color={DOME_COLOR} />
        </mesh>
      )}
    </group>
  );
}

// ── Worker: cylinder body + sphere head, sits atop tower ────────────────────
function Worker({ r, c, workerKey, towerLevel, selected, onWorkerClick, onCellClick }) {
  const [x, z] = cellXZ(r, c);
  const isP1 = workerKey.startsWith('p1');
  const bodyColor = isP1 ? P1_COLOR : P2_COLOR;
  const ringColor = isP1 ? P1_RING  : P2_RING;

  // Base of worker = top of tower blocks
  const baseY = 0.06 + towerLevel * BLOCK_H;
  const bodyH = 0.55;
  const headR = 0.24;

  return (
    <group position={[x, baseY, z]}>
      {/* Body */}
      <mesh position={[0, bodyH / 2, 0]} onClick={onWorkerClick || onCellClick}>
        <cylinderGeometry args={[0.25, 0.30, bodyH, 14]} />
        <meshLambertMaterial color={bodyColor} />
      </mesh>

      {/* Head */}
      <mesh position={[0, bodyH + headR * 0.9, 0]} onClick={onWorkerClick || onCellClick}>
        <sphereGeometry args={[headR, 14, 10]} />
        <meshLambertMaterial color={bodyColor} />
      </mesh>

      {/* Colored ring around neck */}
      <mesh position={[0, bodyH * 0.72, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.27, 0.06, 8, 20]} />
        <meshLambertMaterial color={ringColor} />
      </mesh>

      {/* Selection halo at base */}
      {selected && (
        <mesh position={[0, 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.44, 0.07, 8, 24]} />
          <meshLambertMaterial color="#ffe030" />
        </mesh>
      )}
    </group>
  );
}

// ── Main Scene ───────────────────────────────────────────────────────────────
export default function Scene3D({ game, highlights, onCellClick, onWorkerClick }) {
  const { board, workers, selectedWorker } = game;

  return (
    <Canvas>
      <PerspectiveCamera makeDefault position={[0, 9, 9]} fov={48} />
      <OrbitControls
        target={[0, 1, 0]}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.4}
        minDistance={9}
        maxDistance={20}
        enablePan={false}
      />

      {/* Lighting */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 12, 6]}  intensity={0.9} castShadow />
      <directionalLight position={[-4, 6, -5]} intensity={0.25} />

      {/* Board base */}
      <mesh position={[0, -0.10, 0]}>
        <boxGeometry args={[5 * CELL, 0.20, 5 * CELL]} />
        <meshLambertMaterial color={BOARD_COLOR} />
      </mesh>

      {/* Cells */}
      {board.map((row, r) =>
        row.map((cell, c) => {
          const key = `${r},${c}`;
          return (
            <TowerCell
              key={key}
              r={r} c={c}
              cell={cell}
              highlight={highlights[key]}
              onCellClick={() => onCellClick(r, c)}
            />
          );
        })
      )}

      {/* Workers */}
      {Object.entries(workers).map(([key, pos]) => {
        if (!pos) return null;
        const towerLevel = board[pos.r][pos.c].level;
        const isSelected = selectedWorker === key;
        const owner = key.startsWith('p1') ? 'p1' : 'p2';
        const canSelect = onWorkerClick && owner === game.currentPlayer && game.phase === 'select';
        return (
          <Worker
            key={key}
            r={pos.r} c={pos.c}
            workerKey={key}
            towerLevel={towerLevel}
            selected={isSelected}
            onWorkerClick={canSelect ? () => onWorkerClick(key) : null}
            onCellClick={() => onCellClick(pos.r, pos.c)}
          />
        );
      })}
    </Canvas>
  );
}

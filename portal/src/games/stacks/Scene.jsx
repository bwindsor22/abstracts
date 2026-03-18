// Scene.jsx — 3D board rendered with react-three-fiber
import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { cellIdx } from './Game';

// ── Colours ────────────────────────────────────────────────────────────────
const P1_COLOR   = '#e8d5a0';  // warm cream
const P2_COLOR   = '#6b4226';  // lighter walnut (visible on purple)
const P1_EMISSIVE = '#7a6a35';
const P2_EMISSIVE = '#5a3a20';
const BOARD_COLOR = '#1a0d2e';
const CELL_LIGHT  = '#352055';
const CELL_DARK   = '#281545';
const SEL_COLOR   = '#ffe066';
const VALID_COLOR = '#44cc88';
const HOVER_COLOR = '#ccaa44';

const CELL_SIZE = 1.0;
const GAP       = 0.04;
const CELL_STEP = CELL_SIZE + GAP;

// offset so board is centered
function cellPos(r, c, size) {
  const offset = (size - 1) / 2 * CELL_STEP;
  return [(c * CELL_STEP) - offset, 0, (r * CELL_STEP) - offset];
}

// ── Cell (board square) ────────────────────────────────────────────────────
function Cell({ r, c, size, isLight, isSelected, isValid, isHovered, onClick, onHover }) {
  let color = (r + c) % 2 === 0 ? CELL_LIGHT : CELL_DARK;
  let emissive = '#000000';
  let emissiveIntensity = 0;

  if (isSelected) { emissive = SEL_COLOR; emissiveIntensity = 0.6; }
  else if (isValid) { emissive = VALID_COLOR; emissiveIntensity = 0.5; }
  else if (isHovered) { emissive = HOVER_COLOR; emissiveIntensity = 0.3; }

  const [x, , z] = cellPos(r, c, size);
  return (
    <mesh
      position={[x, -0.06, z]}
      onClick={onClick}
      onPointerOver={(e) => { e.stopPropagation(); onHover(true); }}
      onPointerOut={() => onHover(false)}
      receiveShadow
    >
      <boxGeometry args={[CELL_SIZE, 0.1, CELL_SIZE]} />
      <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={emissiveIntensity} />
    </mesh>
  );
}

// ── Single piece ───────────────────────────────────────────────────────────
function Piece({ piece, y, isTop }) {
  const color = piece.owner === 'p1' ? P1_COLOR : P2_COLOR;
  const emissive = piece.owner === 'p1' ? P1_EMISSIVE : P2_EMISSIVE;

  if (piece.type === 'flat') {
    return (
      <mesh position={[0, y + 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.36, 0.36, 0.08, 24]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.1} roughness={0.6} metalness={0.1} />
      </mesh>
    );
  }

  if (piece.type === 'stand') {
    return (
      <mesh position={[0, y + 0.3, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <boxGeometry args={[0.12, 0.6, 0.38]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.15} roughness={0.5} metalness={0.1} />
      </mesh>
    );
  }

  if (piece.type === 'cap') {
    return (
      <group position={[0, y, 0]}>
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.28, 0.34, 0.28, 20]} />
          <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.15} roughness={0.4} metalness={0.2} />
        </mesh>
        <mesh position={[0, 0.38, 0]} castShadow>
          <sphereGeometry args={[0.28, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.15} roughness={0.4} metalness={0.2} />
        </mesh>
      </group>
    );
  }

  return null;
}

// ── Stack of pieces on one cell ────────────────────────────────────────────
function Stack({ r, c, size, pieces, isSelected, onClick }) {
  const [hovered, setHovered] = useState(false);
  const [x, , z] = cellPos(r, c, size);

  let yAcc = 0;
  const pieceEls = pieces.map((p, i) => {
    const y = yAcc;
    if (p.type === 'flat')  yAcc += 0.08;
    else if (p.type === 'stand') yAcc += 0.6;
    else if (p.type === 'cap')  yAcc += 0.45;
    return <Piece key={i} piece={p} y={y} isTop={i === pieces.length - 1} />;
  });

  return (
    <group
      position={[x, 0, z]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Selection ring */}
      {(isSelected || hovered) && (
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.48, 32]} />
          <meshBasicMaterial color={isSelected ? SEL_COLOR : HOVER_COLOR} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}
      {pieceEls}
    </group>
  );
}

// ── Board ──────────────────────────────────────────────────────────────────
function Board({ gameState, selectedCell, validMoves, onCellClick, onStackClick }) {
  const [hoveredCell, setHoveredCell] = useState(null);
  const { board, size } = gameState;

  const cells = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const i = cellIdx(r, c, size);
      const cell = board[i];
      const isSelected = selectedCell && selectedCell.r === r && selectedCell.c === c;
      const isValid = validMoves.some(m => m.r === r && m.c === c);
      const isHovered = hoveredCell && hoveredCell.r === r && hoveredCell.c === c;

      cells.push(
        <Cell
          key={i}
          r={r} c={c} size={size}
          isSelected={isSelected}
          isValid={isValid}
          isHovered={isHovered}
          onClick={() => onCellClick(r, c)}
          onHover={(h) => setHoveredCell(h ? { r, c } : null)}
        />
      );

      if (cell.length > 0) {
        cells.push(
          <Stack
            key={`s-${i}`}
            r={r} c={c} size={size}
            pieces={cell}
            isSelected={isSelected}
            onClick={() => onStackClick(r, c)}
          />
        );
      }
    }
  }

  // Board base
  const boardW = size * CELL_STEP + 0.4;
  return (
    <group>
      {/* Board base */}
      <mesh position={[0, -0.15, 0]} receiveShadow>
        <boxGeometry args={[boardW, 0.2, boardW]} />
        <meshStandardMaterial color={BOARD_COLOR} roughness={0.8} />
      </mesh>
      {cells}
    </group>
  );
}

// ── Carry count picker (floating 3D UI) ────────────────────────────────────
function CarryPicker({ max, value, onChange }) {
  const buttons = [];
  for (let n = 1; n <= max; n++) {
    const isActive = n === value;
    buttons.push(
      <mesh
        key={n}
        position={[(n - (max + 1) / 2) * 0.45, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onChange(n); }}
      >
        <cylinderGeometry args={[0.17, 0.17, 0.08, 20]} />
        <meshStandardMaterial color={isActive ? SEL_COLOR : '#555'} emissive={isActive ? '#aa8800' : '#000'} emissiveIntensity={isActive ? 0.5 : 0} />
      </mesh>
    );
  }
  return <group position={[0, 1.8, 0]}>{buttons}</group>;
}

// ── Main Scene ─────────────────────────────────────────────────────────────
export default function Scene({ gameState, selectedCell, validMoves, carryMax, carryCount, onCellClick, onStackClick, onSetCarry }) {
  return (
    <Canvas
      shadows
      style={{ width: '100vw', height: '100vh' }}
      gl={{ antialias: true, clearColor: '#191022' }}
    >
      <PerspectiveCamera makeDefault position={[0, 7, 6]} fov={45} near={0.1} far={100} />
      <OrbitControls
        target={[0, 0, 0]}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.2}
        enablePan={false}
        minDistance={4}
        maxDistance={14}
      />

      {/* Lighting */}
      <ambientLight color="#6633cc" intensity={0.3} />
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <pointLight position={[-4, 6, -4]} intensity={0.4} />

      <Board
        gameState={gameState}
        selectedCell={selectedCell}
        validMoves={validMoves}
        onCellClick={onCellClick}
        onStackClick={onStackClick}
      />

      {selectedCell && carryMax > 1 && (
        <group position={[
          (selectedCell.c - (gameState.size - 1) / 2) * CELL_STEP,
          0,
          (selectedCell.r - (gameState.size - 1) / 2) * CELL_STEP,
        ]}>
          <CarryPicker max={carryMax} value={carryCount} onChange={onSetCarry} />
        </group>
      )}
    </Canvas>
  );
}

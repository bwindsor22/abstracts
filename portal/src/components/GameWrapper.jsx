import React, { lazy, Suspense, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DndProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { TouchBackend } from 'react-dnd-touch-backend';
import { GAME_MAP } from '../data/games';
import GameGuide from './GameGuide';
import BugReport from './BugReport';
import './GameWrapper.css';
import './GameGuide.css';

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

const _touch = isTouchDevice();
const _backend = _touch ? TouchBackend : HTML5Backend;
const _backendOptions = _touch ? { enableMouseEvents: true } : undefined;

// Lazy-load each game to keep initial bundle small
const GAME_COMPONENTS = {
  hexes:   lazy(() => import('../games/hexes/App')),
  marbles: lazy(() => import('../games/marbles/App')),
  bridges: lazy(() => import('../games/bridges/App')),
  pairs:   lazy(() => import('../games/stones/App')),
  walls:   lazy(() => import('../games/walls/App')),
  bugs:    lazy(() => import('../games/bugs/App')),
  circles: lazy(() => import('../games/circles/App')),
  stacks:  lazy(() => import('../games/stacks/App')),
  towers:  lazy(() => import('../games/towers/App')),
  trees:   lazy(() => import('../games/trees/App')),
  sowing:  lazy(() => import('../games/sowing/App')),
  mills:   lazy(() => import('../games/mills/App')),
  blocks:  lazy(() => import('../games/blocks/App')),
  fives:   lazy(() => import('../games/fives/App')),
  omweso:  lazy(() => import('../games/omweso/App')),
  flips:   lazy(() => import('../games/flips/App')),
};

export default function GameWrapper({ onBack, onResult }) {
  const { gameId } = useParams();
  const game = GAME_MAP[gameId];
  const [showGuide, setShowGuide] = useState(false);
  const GameComponent = GAME_COMPONENTS[gameId];

  const toggleGuide = useCallback(() => setShowGuide(g => !g), []);

  if (!GameComponent || !game) {
    return (
      <div className="game-wrapper-error">
        <p>Game "{gameId}" not found.</p>
        <button onClick={onBack}>← Back to Library</button>
      </div>
    );
  }

  return (
    <DndProvider key={gameId} backend={_backend} options={_backendOptions}>
      <Suspense fallback={
        <div className="game-wrapper-loading">
          <div className="game-wrapper-spinner" />
          <p>Loading {game.name}…</p>
        </div>
      }>
        <GameComponent onBack={onBack} onResult={onResult} />
        <div className="game-wrapper-disclaimer">
          Our games are original digital implementations of classic abstract strategy mechanics. We are fans of the tabletop industry and encourage players to support the official physical releases of the games that inspired us.
        </div>
      </Suspense>

      {/* Floating buttons */}
      <BugReport />
      <button className="game-guide-fab" onClick={toggleGuide} aria-label="How to play">?</button>

      {/* Guide overlay */}
      {showGuide && (
        <div className="game-guide-overlay" onClick={toggleGuide}>
          <div className="game-guide-panel" onClick={e => e.stopPropagation()}>
            <div className="game-guide-panel-header">
              <span className="game-guide-panel-title">How to Play</span>
              <button className="game-guide-panel-close" onClick={toggleGuide}>×</button>
            </div>
            <GameGuide gameId={gameId} />
          </div>
        </div>
      )}
    </DndProvider>
  );
}

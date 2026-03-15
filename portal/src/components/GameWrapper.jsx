import React, { lazy, Suspense } from 'react';
import './GameWrapper.css';

// Lazy-load each game to keep initial bundle small
const GAME_COMPONENTS = {
  hexes:   lazy(() => import('../games/hexes/App')),
  marbles: lazy(() => import('../games/marbles/App')),
  bridges: lazy(() => import('../games/bridges/App')),
  stones:  lazy(() => import('../games/stones/App')),
  walls:   lazy(() => import('../games/walls/App')),
  bugs:    lazy(() => import('../games/bugs/App')),
  circles: lazy(() => import('../games/circles/App')),
  stacks:  lazy(() => import('../games/stacks/App')),
  towers:  lazy(() => import('../games/towers/App')),
  trees:   lazy(() => import('../games/trees/App')),
};

export default function GameWrapper({ game, onBack, onResult }) {
  const GameComponent = GAME_COMPONENTS[game.id];
  if (!GameComponent) {
    return (
      <div className="game-wrapper-error">
        <p>Game "{game.id}" not found.</p>
        <button onClick={onBack}>← Back to Library</button>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="game-wrapper-loading">
        <div className="game-wrapper-spinner" />
        <p>Loading {game.name}…</p>
      </div>
    }>
      <GameComponent onBack={onBack} onResult={onResult} />
    </Suspense>
  );
}

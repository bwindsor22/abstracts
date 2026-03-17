import React, { useState, useCallback } from 'react';
import { GAMES } from '../data/games';
import GameGuide from '../components/GameGuide';
import './Library.css';

function GameIcon({ icon, className }) {
  return (
    <span className={`material-symbols-outlined ${className || ''}`} aria-hidden="true">
      {icon}
    </span>
  );
}

function GameCard({ game, onClick }) {
  return (
    <button className="library-card card-hover" onClick={() => onClick(game)}>
      <div className="library-card-glow" />
      <GameIcon icon={game.icon} className="library-card-icon" />
      <span className="library-card-name">{game.name}</span>
      <span className="library-card-subtitle">{game.subtitle}</span>
    </button>
  );
}

function PlayModal({ game, onPlay, onClose }) {
  const handleOverlayClick = useCallback((e) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  return (
    <div className="library-modal-overlay" onClick={handleOverlayClick}>
      <div className="library-modal">
        <div className="library-modal-header">
          <div className="library-modal-game-info">
            <GameIcon icon={game.icon} className="library-modal-icon" />
            <div>
              <div className="library-modal-name">{game.name}</div>
              <div className="library-modal-subtitle">{game.subtitle}</div>
            </div>
          </div>
          <button className="library-modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <GameGuide gameId={game.id} />

        <button
          className="library-modal-play-btn"
          onClick={() => onPlay(game)}
          style={{ marginTop: 16 }}
        >
          Play
        </button>
      </div>
    </div>
  );
}

export default function Library({ onPlay }) {
  const [selectedGame, setSelectedGame] = useState(null);

  const modern = GAMES.filter(g => g.category === 'modern');
  const classic = GAMES.filter(g => g.category === 'classic');
  const ancient = GAMES.filter(g => g.category === 'ancient');

  const handlePlay = useCallback((game) => {
    setSelectedGame(null);
    onPlay(game);
  }, [onPlay]);

  return (
    <div className="library">
      {modern.length > 0 && (
        <section className="library-section">
          <div className="library-section-header">
            <h2 className="library-section-title">Modern Marvels</h2>
            <span className="library-section-tag">1990–PRESENT</span>
          </div>
          <div className="library-grid">
            {modern.map(game => (
              <GameCard key={game.id} game={game} onClick={setSelectedGame} />
            ))}
          </div>
        </section>
      )}

      {classic.length > 0 && (
        <section className="library-section">
          <div className="library-section-header">
            <h2 className="library-section-title">Timeless Classics</h2>
            <span className="library-section-tag">1940–1990</span>
          </div>
          <div className="library-grid">
            {classic.map(game => (
              <GameCard key={game.id} game={game} onClick={setSelectedGame} />
            ))}
          </div>
        </section>
      )}

      {ancient.length > 0 && (
        <section className="library-section">
          <div className="library-section-header">
            <h2 className="library-section-title">Ancient Foundations</h2>
            <span className="library-section-tag">PRE-1940</span>
          </div>
          <div className="library-grid">
            {ancient.map(game => (
              <GameCard key={game.id} game={game} onClick={setSelectedGame} />
            ))}
          </div>
        </section>
      )}

      {selectedGame && (
        <PlayModal
          game={selectedGame}
          onPlay={handlePlay}
          onClose={() => setSelectedGame(null)}
        />
      )}
    </div>
  );
}

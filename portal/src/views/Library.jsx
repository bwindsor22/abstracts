import React, { useState, useCallback } from 'react';
import { GAMES } from '../data/games';
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

        <div className="library-modal-description">
          {game.description || game.subtitle}
        </div>

        <button
          className="library-modal-play-btn"
          onClick={() => onPlay(game)}
        >
          Play
        </button>
      </div>
    </div>
  );
}

export default function Library({ onPlay }) {
  const [search, setSearch] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);

  const filtered = GAMES.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  const modern = filtered.filter(g => g.category === 'modern');
  const classic = filtered.filter(g => g.category === 'classic');

  const handlePlay = useCallback((game) => {
    setSelectedGame(null);
    onPlay(game);
  }, [onPlay]);

  return (
    <div className="library">
      {/* Search */}
      <div className="library-search-wrap">
        <svg className="library-search-icon" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="library-search"
          type="search"
          placeholder="Search games…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search games"
        />
      </div>

      {filtered.length === 0 && (
        <div className="library-empty">No games found for "{search}"</div>
      )}

      {modern.length > 0 && (
        <section className="library-section">
          <div className="library-section-header">
            <h2 className="library-section-title">Modern Marvels</h2>
            <span className="library-section-tag">NEW RELEASES</span>
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
            <span className="library-section-tag">ALL TIME HITS</span>
          </div>
          <div className="library-grid">
            {classic.map(game => (
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

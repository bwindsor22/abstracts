import React, { useEffect, useState, useRef } from 'react';
import './GameFrame.css';

export default function GameFrame({ game, onBack, onResult }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const iframeRef = useRef(null);
  const errorTimerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'EXIT') onBack();
      if (e.data.type === 'GAME_RESULT') onResult(e.data);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onBack, onResult]);

  useEffect(() => {
    // If iframe hasn't loaded in 8 seconds, show error
    errorTimerRef.current = setTimeout(() => {
      if (loading) setError(true);
    }, 8000);
    return () => clearTimeout(errorTimerRef.current);
  }, [loading]);

  const handleLoad = () => {
    clearTimeout(errorTimerRef.current);
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    clearTimeout(errorTimerRef.current);
    setLoading(false);
    setError(true);
  };

  return (
    <div className="game-frame-overlay">
      <div className="game-frame-bar">
        <button className="game-frame-back-btn" onClick={onBack}>
          <svg viewBox="0 0 24 24">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back
        </button>
        <span className="game-frame-title">{game.name.toUpperCase()}</span>
        <button className="game-frame-exit-btn" onClick={onBack} aria-label="Exit game">×</button>
      </div>

      <div className="game-frame-content">
        {loading && !error && (
          <div className="game-frame-loading">
            <div className="game-frame-spinner" />
            <span>Loading {game.name}…</span>
          </div>
        )}

        {error && (
          <div className="game-frame-error">
            <div className="game-frame-error-icon">🎮</div>
            <h2>Game Not Running</h2>
            <p>
              {game.name} is not currently running. Start it on port {game.port} and try again.
            </p>
            <button className="game-frame-error-btn" onClick={onBack}>Back to Library</button>
          </div>
        )}

        <iframe
          ref={iframeRef}
          className="game-frame-iframe"
          src={`http://localhost:${game.port}`}
          title={game.name}
          onLoad={handleLoad}
          onError={handleError}
          style={{ opacity: loading || error ? 0 : 1, position: loading || error ? 'absolute' : 'static' }}
        />
      </div>
    </div>
  );
}

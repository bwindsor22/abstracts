import React, { useState, useMemo } from 'react';
import { getHistory, getReplay } from '../utils/storage';
import { GAME_MAP } from '../data/games';
import ReplayViewer from '../components/ReplayViewer';
import './MatchHistory.css';

function relativeTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function MatchHistory() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [replayGame, setReplayGame] = useState(null);
  const history = getHistory();

  // Build filter list from games that have history
  const gameFilters = useMemo(() => {
    const ids = [...new Set(history.map(g => g.gameId))];
    return ids.filter(id => GAME_MAP[id]);
  }, [history]);

  const filtered = activeFilter === 'all'
    ? history
    : history.filter(g => g.gameId === activeFilter);

  // Stats based on filtered list
  const statsGames = filtered.length;
  const statsWins = filtered.filter(g => g.won).length;
  const statsLosses = statsGames - statsWins;

  return (
    <div className="match-history">
      <h1 className="match-history-heading">Match History</h1>

      {/* Stats */}
      <div className="match-history-stats">
        <div className="match-stat-card">
          <div className="match-stat-value">{statsGames}</div>
          <div className="match-stat-label">PLAYED</div>
        </div>
        <div className="match-stat-card">
          <div className="match-stat-value">{statsWins}</div>
          <div className="match-stat-label">WINS</div>
        </div>
        <div className="match-stat-card">
          <div className="match-stat-value">{statsLosses}</div>
          <div className="match-stat-label">LOSSES</div>
        </div>
      </div>

      {/* Filters */}
      <div className="match-history-filters">
        <button
          className={`match-filter-chip${activeFilter === 'all' ? ' active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All Games
        </button>
        {gameFilters.map(id => (
          <button
            key={id}
            className={`match-filter-chip${activeFilter === id ? ' active' : ''}`}
            onClick={() => setActiveFilter(id)}
          >
            {GAME_MAP[id]?.name || id}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="match-section-label">RECENT GAMES</div>

      {filtered.length === 0 ? (
        <div className="match-history-empty">
          {history.length === 0
            ? 'No games played yet. Head to the Library to start!'
            : 'No games for this filter.'}
        </div>
      ) : (
        <div className="match-history-list">
          {filtered.map((game, i) => {
            const meta = GAME_MAP[game.gameId];
            return (
              <div key={i} className="match-history-row">
                <div className="match-row-icon">
                  {meta
                    ? <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--primary)', fontVariationSettings: "'FILL' 0, 'wght' 400" }}>{meta.icon}</span>
                    : '🎮'}
                </div>
                <div className="match-row-info">
                  <div className="match-row-name">{game.gameName || meta?.name || game.gameId}</div>
                  <div className="match-row-meta">
                    vs. {game.difficulty ? game.difficulty.charAt(0).toUpperCase() + game.difficulty.slice(1) : 'AI'}
                    {game.moves > 0 ? ` · ${game.moves} moves` : ''}
                  </div>
                </div>
                <div className="match-row-result">
                  <span className={`match-result-badge${game.won ? ' won' : ' lost'}`}>
                    {game.won ? 'WON' : 'LOST'}
                  </span>
                  <span className="match-row-time">{relativeTime(game.timestamp)}</span>
                  {game.replayKey && (
                    <button className="match-replay-btn" onClick={(e) => { e.stopPropagation(); setReplayGame(game); }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>replay</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {replayGame && (
        <ReplayViewer
          gameId={replayGame.gameId}
          gameName={replayGame.gameName}
          snapshots={getReplay(replayGame.replayKey)}
          onClose={() => setReplayGame(null)}
        />
      )}
    </div>
  );
}

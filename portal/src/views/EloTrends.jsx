import React, { useMemo } from 'react';
import { getHistory, computeEloHistory, BASE_ELO, AI_RATINGS } from '../utils/storage';
import { GAMES } from '../data/games';
import './EloTrends.css';

function EloChart({ points }) {
  if (points.length < 2) {
    return (
      <div className="elo-chart-wrap">
        <svg viewBox="0 0 200 60" preserveAspectRatio="none">
          <line x1="0" y1="30" x2="200" y2="30" stroke="rgba(153,66,240,0.2)" strokeWidth="2" strokeDasharray="4 4" />
        </svg>
      </div>
    );
  }

  const minY = Math.min(...points) - 10;
  const maxY = Math.max(...points) + 10;
  const range = maxY - minY || 1;
  const W = 200;
  const H = 60;

  const toX = (i) => (i / (points.length - 1)) * W;
  const toY = (v) => H - ((v - minY) / range) * H;

  const pathD = points
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
    .join(' ');

  const areaD = `${pathD} L ${W} ${H} L 0 ${H} Z`;

  return (
    <div className="elo-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id={`elo-grad-${points[0]}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(153,66,240,0.3)" />
            <stop offset="100%" stopColor="rgba(153,66,240,0)" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#elo-grad-${points[0]})`} />
        <path d={pathD} className="elo-chart-line" />
      </svg>
    </div>
  );
}

function GameEloCard({ game, onClick }) {
  const history = getHistory().filter(g => g.gameId === game.id);
  const eloPoints = useMemo(() => computeEloHistory([...history].reverse()), [history]);
  const currentElo = eloPoints[eloPoints.length - 1];
  const delta = currentElo - BASE_ELO;

  return (
    <div className="elo-game-card" onClick={() => onClick && onClick(game.id)} style={{ cursor: onClick ? 'pointer' : undefined }}>
      <div className="elo-game-header">
        <span className="material-symbols-outlined elo-game-icon">{game.icon}</span>
        <div>
          <div className="elo-game-name">{game.name}</div>
          <div className="elo-game-meta">{history.length} game{history.length !== 1 ? 's' : ''}</div>
        </div>
      </div>

      <div className="elo-game-rating">
        <span className="elo-rating-value">{currentElo}</span>
        <span className="elo-rating-label">ELO</span>
        <span className={`elo-rating-delta ${delta > 0 ? 'positive' : delta < 0 ? 'negative' : 'neutral'}`}>
          {delta > 0 ? '+' : ''}{delta}
        </span>
      </div>

      <EloChart points={eloPoints} />
      <div className="elo-view-history">View match history →</div>
    </div>
  );
}

export default function EloTrends({ onNavigate }) {
  const history = getHistory();
  const activeGameIds = new Set(history.map(g => g.gameId));
  const activeGames = GAMES.filter(g => activeGameIds.has(g.id));
  const inactiveGames = GAMES.filter(g => !activeGameIds.has(g.id));

  const handleGameClick = (gameId) => {
    if (onNavigate) onNavigate('history', { filter: gameId });
  };

  return (
    <div className="elo-trends">
      <h1 className="elo-trends-heading">Elo Ratings</h1>
      <p className="elo-trends-subtext">
        Easy AI {AI_RATINGS.easy} · Medium AI {AI_RATINGS.medium} · Hard AI {AI_RATINGS.hard} · You start at {BASE_ELO}
      </p>

      {history.length === 0 && (
        <div className="elo-empty">Play some games to see your Elo ratings!</div>
      )}

      <div className="elo-trends-grid">
        {activeGames.map(game => (
          <GameEloCard key={game.id} game={game} onClick={handleGameClick} />
        ))}
        {inactiveGames.map(game => (
          <div key={game.id} className="elo-starter-card elo-game-card">
            <div className="elo-game-header">
              <span className="material-symbols-outlined elo-game-icon">{game.icon}</span>
              <div>
                <div className="elo-game-name">{game.name}</div>
                <div className="elo-game-meta">0 games</div>
              </div>
            </div>
            <div className="elo-game-rating">
              <span className="elo-rating-value">{BASE_ELO}</span>
              <span className="elo-rating-label">ELO</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

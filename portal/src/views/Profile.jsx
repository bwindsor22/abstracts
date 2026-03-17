import React, { useMemo } from 'react';
import { getStats, getHistory, getEarnedBadges } from '../utils/storage';
import { GAME_MAP } from '../data/games';
import { ALL_BADGES } from '../data/badges';
import './Profile.css';

export default function Profile({ onNavigate }) {
  const stats = getStats();
  const history = getHistory();
  const earnedList = getEarnedBadges();

  const winRate = stats.totalGames > 0
    ? Math.round((stats.totalWins / stats.totalGames) * 100)
    : 0;

  const favoriteGame = useMemo(() => {
    if (Object.keys(stats.byGame).length === 0) return null;
    const top = Object.entries(stats.byGame).sort((a, b) => b[1].games - a[1].games)[0];
    return GAME_MAP[top[0]] || null;
  }, [stats]);

  const recentBadges = useMemo(() => {
    const sorted = [...earnedList].sort((a, b) => b.earnedAt - a.earnedAt).slice(0, 3);
    return sorted.map(e => ALL_BADGES.find(b => b.id === e.id)).filter(Boolean);
  }, [earnedList]);

  return (
    <div className="profile-view">
      <div className="profile-header">
        <div className="profile-avatar">
          <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--primary)' }}>person</span>
        </div>
        <div className="profile-info">
          <div className="profile-username">Player</div>
          <div className="profile-tagline">
            {stats.totalGames === 0
              ? 'Ready to play — start your first game!'
              : `${stats.totalGames} games played · ${winRate}% win rate`}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="profile-stats-grid">
        <div className="profile-stat-card">
          <div className="profile-stat-value">{stats.totalGames}</div>
          <div className="profile-stat-label">GAMES</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-value">{stats.totalWins}</div>
          <div className="profile-stat-label">WINS</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-value">{winRate}%</div>
          <div className="profile-stat-label">WIN RATE</div>
        </div>
        <div className="profile-stat-card">
          <div className="profile-stat-value">
            {favoriteGame
              ? <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--primary)' }}>{favoriteGame.icon}</span>
              : '—'}
          </div>
          <div className="profile-stat-label">{favoriteGame ? favoriteGame.name.toUpperCase() : 'FAVORITE'}</div>
        </div>
      </div>

      {/* Recent Badges */}
      <div className="profile-section">
        <div className="profile-section-header">
          <span className="profile-section-title">RECENT BADGES</span>
          <button className="profile-section-link" onClick={() => onNavigate('badges')}>
            View All →
          </button>
        </div>
        {recentBadges.length === 0 ? (
          <div className="profile-no-badges">No badges earned yet — play some games!</div>
        ) : (
          <div className="profile-badges-row">
            {recentBadges.map(badge => (
              <div key={badge.id} className="profile-badge-mini">
                {badge.image ? (
                  <img src={badge.image} alt={badge.name} className="profile-badge-mini-img" />
                ) : (
                  <span className="profile-badge-mini-icon material-symbols-outlined">{badge.icon}</span>
                )}
                <span className="profile-badge-mini-name">{badge.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick navigation */}
      <div className="profile-section">
        <div className="profile-section-header">
          <span className="profile-section-title">QUICK ACCESS</span>
        </div>
        <div className="profile-nav-buttons">
          <button className="profile-nav-btn" onClick={() => onNavigate('library')}>
            <svg viewBox="0 0 24 24">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            Home
          </button>
          <button className="profile-nav-btn" onClick={() => onNavigate('history')}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Match History
          </button>
          <button className="profile-nav-btn" onClick={() => onNavigate('elo')}>
            <svg viewBox="0 0 24 24">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            ELO Trends
          </button>
          <button className="profile-nav-btn" onClick={() => onNavigate('badges')}>
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="6" />
              <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
            </svg>
            Badges
          </button>
        </div>
      </div>
    </div>
  );
}

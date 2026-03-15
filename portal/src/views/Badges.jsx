import React, { useState, useMemo } from 'react';
import { ALL_BADGES, RARITY_COLORS } from '../data/badges';
import { getEarnedBadges, getStats } from '../utils/storage';
import './Badges.css';

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function BadgeCard({ badge, earnedEntry }) {
  const earned = !!earnedEntry;
  const rarityColor = RARITY_COLORS[badge.rarity] || RARITY_COLORS.COMMON;

  return (
    <div
      className={`badge-card${earned ? ' earned' : ' locked'}`}
      style={{ '--rarity-color': rarityColor }}
    >
      {!earned && <span className="badge-locked-icon">🔒</span>}
      <span className={`badge-card-icon${!earned ? ' locked-icon' : ''}`}>{badge.icon}</span>
      <span className="badge-card-rarity">{badge.rarity}</span>
      <span className="badge-card-name">{badge.name}</span>
      <span className="badge-card-desc">{badge.description}</span>
      {earned && earnedEntry?.earnedAt && (
        <span className="badge-card-date">Earned {formatDate(earnedEntry.earnedAt)}</span>
      )}
    </div>
  );
}

export default function Badges() {
  const [tab, setTab] = useState('all');
  const earnedList = getEarnedBadges();
  const stats = getStats();

  const earnedMap = useMemo(() =>
    Object.fromEntries(earnedList.map(e => [e.id, e])),
    [earnedList]
  );

  const earnedCount = earnedList.length;
  const level = earnedCount >= 8 ? 'LEGEND' : earnedCount >= 5 ? 'VETERAN' : earnedCount >= 2 ? 'PLAYER' : 'ROOKIE';

  const displayBadges = useMemo(() => {
    if (tab === 'all') return ALL_BADGES;
    if (tab === 'recent') {
      const sorted = [...earnedList].sort((a, b) => b.earnedAt - a.earnedAt).slice(0, 6);
      return sorted.map(e => ALL_BADGES.find(b => b.id === e.id)).filter(Boolean);
    }
    if (tab === 'locked') return ALL_BADGES.filter(b => !earnedMap[b.id]);
    return ALL_BADGES;
  }, [tab, earnedList, earnedMap]);

  return (
    <div className="badges-view">
      <h1 className="badges-view-heading">Achievements</h1>

      <div className="badges-player-row">
        <div className="badges-player-avatar">🎮</div>
        <div>
          <div className="badges-player-name">Stratos Player</div>
          <div className="badges-player-level">{level}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>{earnedCount}/{ALL_BADGES.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>BADGES</div>
        </div>
      </div>

      <div className="badges-tabs">
        {[
          { id: 'all', label: 'All Badges' },
          { id: 'recent', label: 'Recent' },
          { id: 'locked', label: 'Locked' },
        ].map(t => (
          <button
            key={t.id}
            className={`badges-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="badges-grid">
        {displayBadges.length === 0 && (
          <div className="badges-empty">
            {tab === 'recent' ? 'No badges earned yet.' : 'All badges earned!'}
          </div>
        )}
        {displayBadges.map(badge => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            earnedEntry={earnedMap[badge.id]}
          />
        ))}
      </div>
    </div>
  );
}

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
      {!earned && (
        <span className="badge-locked-icon material-symbols-outlined">lock</span>
      )}
      <div className="badge-card-icon-wrap">
        {badge.image ? (
          <img
            src={badge.image}
            alt={badge.name}
            className={`badge-card-img${!earned ? ' locked-icon' : ''}`}
          />
        ) : (
          <span className={`badge-card-icon material-symbols-outlined${!earned ? ' locked-icon' : ''}`}>
            {badge.icon}
          </span>
        )}
      </div>
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
  const [tab, setTab] = useState('earned');
  const earnedList = getEarnedBadges();
  const stats = getStats();

  const earnedMap = useMemo(() =>
    Object.fromEntries(earnedList.map(e => [e.id, e])),
    [earnedList]
  );

  const earnedCount = earnedList.length;
  const level = earnedCount >= 10 ? 'LEGEND' : earnedCount >= 6 ? 'VETERAN' : earnedCount >= 3 ? 'PLAYER' : 'ROOKIE';

  const displayBadges = useMemo(() => {
    if (tab === 'earned') {
      return ALL_BADGES.filter(b => earnedMap[b.id]);
    }
    if (tab === 'all') return ALL_BADGES;
    if (tab === 'locked') return ALL_BADGES.filter(b => !earnedMap[b.id]);
    return ALL_BADGES;
  }, [tab, earnedList, earnedMap]);

  return (
    <div className="badges-view">
      <h1 className="badges-view-heading">Achievements</h1>

      <div className="badges-player-row">
        <div className="badges-player-avatar">
          <span className="material-symbols-outlined">person</span>
        </div>
        <div>
          <div className="badges-player-name">Player</div>
          <div className="badges-player-level">{level}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary)' }}>{earnedCount}/{ALL_BADGES.length}</div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>BADGES</div>
        </div>
      </div>

      <div className="badges-tabs">
        {[
          { id: 'earned', label: 'Badges' },
          { id: 'all', label: 'All' },
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
            {tab === 'earned' ? 'No badges earned yet. Play some games!' : tab === 'locked' ? 'All badges earned!' : 'No badges available.'}
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

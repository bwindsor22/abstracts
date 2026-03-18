import React, { useState, useEffect } from 'react';
import { GAMES } from '../data/games';
import { fetchLeaderboard } from '../utils/supabase';
import './Leaderboard.css';

const MEDAL = ['gold', 'silver', 'bronze'];

function RankRow({ entry, rank }) {
  const medalClass = rank <= 3 ? ` medal-${MEDAL[rank - 1]}` : '';
  return (
    <div className={`lb-row${medalClass}`}>
      <span className="lb-rank">{rank}</span>
      <span className="lb-name">{entry.username}</span>
      <span className="lb-elo">{entry.elo}</span>
      <span className="lb-games">{entry.games_played}</span>
    </div>
  );
}

export default function Leaderboard() {
  const [tab, setTab] = useState('_overall');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const gameId = tab === '_overall' ? null : tab;
    fetchLeaderboard(gameId).then(data => {
      setRows(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tab]);

  const tabs = [
    { id: '_overall', label: 'Overall' },
    ...GAMES.map(g => ({ id: g.id, label: g.name })),
  ];

  return (
    <div className="lb-view">
      <h1 className="lb-heading">Leaderboard</h1>
      <p className="lb-subtext">Top players ranked by Elo rating</p>

      <div className="lb-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`lb-tab${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="lb-table">
        <div className="lb-header">
          <span className="lb-rank">#</span>
          <span className="lb-name">Player</span>
          <span className="lb-elo">Elo</span>
          <span className="lb-games">Games</span>
        </div>

        {loading && (
          <div className="lb-empty">Loading...</div>
        )}

        {!loading && rows.length === 0 && (
          <div className="lb-empty">
            No ranked players yet. Play some games and sign in to appear here!
          </div>
        )}

        {!loading && rows.map((entry, i) => (
          <RankRow key={entry.username + i} entry={entry} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}

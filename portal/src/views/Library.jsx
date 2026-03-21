import React, { useState, useCallback } from 'react';
import { GAMES, GAME_MAP } from '../data/games';
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
      {game.complexity && (
        <span className={`library-card-complexity complexity-${game.complexity}`}>
          {game.complexity}
        </span>
      )}
      <GameIcon icon={game.icon} className="library-card-icon" />
      <span className="library-card-name">{game.name}</span>
      <span className="library-card-subtitle">{game.realName}</span>
    </button>
  );
}

function Section({ title, tag, games, onCardClick }) {
  if (!games || games.length === 0) return null;
  return (
    <section className="library-section">
      <div className="library-section-header">
        <h2 className="library-section-title">{title}</h2>
        {tag && <span className="library-section-tag">{tag}</span>}
      </div>
      <div className="library-grid">
        {games.map(game => (
          <GameCard key={game.id} game={game} onClick={onCardClick} />
        ))}
      </div>
    </section>
  );
}

function SubSection({ title, games, onCardClick }) {
  if (!games || games.length === 0) return null;
  return (
    <div className="library-subsection">
      <div className="library-subsection-label">{title}</div>
      <div className="library-grid">
        {games.map(game => (
          <GameCard key={game.id} game={game} onClick={onCardClick} />
        ))}
      </div>
    </div>
  );
}

// --- View: Time ---
function TimeView({ onCardClick }) {
  const modern = GAMES.filter(g => g.category === 'modern');
  const classic = GAMES.filter(g => g.category === 'classic');
  const heritage = GAMES.filter(g => g.category === 'heritage');
  const ancient = GAMES.filter(g => g.category === 'ancient');
  return (
    <>
      <Section title="Modern Marvels" tag="1990–PRESENT" games={modern} onCardClick={onCardClick} />
      <Section title="Timeless Classics" tag="1940–1990" games={classic} onCardClick={onCardClick} />
      <Section title="Heritage Games" tag="1650s–1880s" games={heritage} onCardClick={onCardClick} />
      <Section title="Ancient Foundations" tag="~2000 BC – 600 AD" games={ancient} onCardClick={onCardClick} />
    </>
  );
}

// --- View: Complexity ---
function ComplexityView({ onCardClick }) {
  const low = GAMES.filter(g => g.complexity === 'low');
  const medium = GAMES.filter(g => g.complexity === 'medium');
  const high = GAMES.filter(g => g.complexity === 'high');
  return (
    <>
      <Section title="Pick Up & Play" tag="LOW" games={low} onCardClick={onCardClick} />
      <Section title="A Few Rules to Learn" tag="MEDIUM" games={medium} onCardClick={onCardClick} />
      <Section title="Deep Systems" tag="HIGH" games={high} onCardClick={onCardClick} />
    </>
  );
}

// --- View: Theme ---
// Thematic trunks showing how games relate and evolve
const THEME_TRUNKS = [
  {
    title: 'Board Influence',
    tagline: 'Shape the board, control the flow',
    subs: [
      { label: 'Alignment', ids: ['fives', 'pairs'] },
      { label: 'Connection', ids: ['hexes', 'bridges'] },
      { label: 'Flipping', ids: ['flips', 'circles'] },
      { label: 'Territory', ids: ['go'] },
    ],
  },
  {
    title: 'Piece Systems',
    tagline: 'The pieces define the world',
    ids: ['bugs', 'trees', 'knights'],
  },
  {
    title: 'Structural Building',
    tagline: 'Stack, build, and climb to victory',
    ids: ['stacks', 'towers'],
  },
  {
    title: 'Constraint & Blocking',
    tagline: 'Control space by limiting your opponent',
    ids: ['mills', 'walls', 'blocks'],
  },
  {
    title: 'Resource Cycles',
    tagline: 'Master loops, timing, and growth',
    ids: ['sowing', 'omweso'],
  },
  {
    title: 'Displacement',
    tagline: 'Move groups, push opponents, dominate space',
    ids: ['marbles'],
  },
];

function resolveIds(ids) {
  return (ids || []).map(id => GAME_MAP[id]).filter(Boolean);
}

function ThemeView({ onCardClick }) {
  return (
    <>
      {THEME_TRUNKS.map(trunk => {
        const hasSubs = trunk.subs && trunk.subs.length > 0;
        const flatGames = hasSubs ? [] : resolveIds(trunk.ids);
        return (
          <section className="library-section" key={trunk.title}>
            <div className="library-section-header">
              <h2 className="library-section-title">{trunk.title}</h2>
              <span className="library-section-tag-theme">{trunk.tagline}</span>
            </div>
            {hasSubs ? (
              trunk.subs.map(sub => (
                <SubSection key={sub.label} title={sub.label} games={resolveIds(sub.ids)} onCardClick={onCardClick} />
              ))
            ) : (
              <div className="library-grid">
                {flatGames.map(game => (
                  <GameCard key={game.id} game={game} onClick={onCardClick} />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}

// --- Play Modal ---
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

        {game.complexity && (
          <div className={`library-modal-complexity complexity-${game.complexity}`}>
            <span className="library-modal-complexity-label">{game.complexity} complexity</span>
            <span className="library-modal-complexity-desc">
              {game.complexity === 'low' && '— pick up and play in under a minute'}
              {game.complexity === 'medium' && '— a few rules to learn before you start'}
              {game.complexity === 'high' && '— multiple systems to learn, best with the guide below'}
            </span>
          </div>
        )}

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

// --- View Toggle ---
const VIEWS = [
  { key: 'complexity', label: 'Number of Rules' },
  { key: 'time', label: 'Date' },
  { key: 'theme', label: 'Theme' },
];

function ViewToggle({ active, onChange }) {
  return (
    <div className="library-view-toggle">
      {VIEWS.map(v => (
        <button
          key={v.key}
          className={`library-view-toggle-btn${active === v.key ? ' active' : ''}`}
          onClick={() => onChange(v.key)}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

// --- Main Library ---
export default function Library({ onPlay }) {
  const [selectedGame, setSelectedGame] = useState(null);
  const [view, setView] = useState('complexity');

  const handlePlay = useCallback((game) => {
    setSelectedGame(null);
    onPlay(game);
  }, [onPlay]);

  return (
    <div className="library">
      <ViewToggle active={view} onChange={setView} />

      {view === 'time' && <TimeView onCardClick={setSelectedGame} />}
      {view === 'complexity' && <ComplexityView onCardClick={setSelectedGame} />}
      {view === 'theme' && <ThemeView onCardClick={setSelectedGame} />}

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

import React, { useState, useCallback } from 'react';
import './App.css';
import Header from './components/Header';
import NavDrawer from './components/NavDrawer';
import GameWrapper from './components/GameWrapper';
import BadgeToast from './components/BadgeToast';
import Library from './views/Library';
import MatchHistory from './views/MatchHistory';
import EloTrends from './views/EloTrends';
import Badges from './views/Badges';
import Profile from './views/Profile';
import { addResult, checkAndAwardBadges } from './utils/storage';
import { ALL_BADGES } from './data/badges';

export default function App() {
  const [view, setView] = useState('library');
  const [viewParams, setViewParams] = useState(null);
  const [playingGame, setPlayingGame] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [newBadges, setNewBadges] = useState([]);

  const navigate = useCallback((v, params) => {
    setView(v);
    setViewParams(params || null);
  }, []);

  const handlePlay = useCallback((game) => {
    setPlayingGame(game); // game = { id, name, icon, category }
  }, []);

  const handleBack = useCallback(() => {
    setPlayingGame(null);
  }, []);

  const handleResult = useCallback((data) => {
    // data: { gameId, gameName, won, moves, difficulty }
    const result = {
      gameId: data.gameId,
      gameName: data.gameName,
      won: !!data.won,
      moves: data.moves || 0,
      difficulty: data.difficulty || 'medium',
      timestamp: Date.now(),
    };
    addResult(result);
    const earned = checkAndAwardBadges(ALL_BADGES);
    if (earned.length > 0) setNewBadges(earned);
    // Don't exit the game — let the user view the end state and click back
  }, []);

  if (playingGame) {
    return (
      <GameWrapper game={playingGame} onBack={handleBack} onResult={handleResult} />
    );
  }

  const views = {
    library: Library,
    history: MatchHistory,
    elo: EloTrends,
    badges: Badges,
    profile: Profile,
  };
  const ViewComponent = views[view] || Library;

  return (
    <div className="app-root">
      <div className="fluid-glow fixed-bg" />
      <Header onMenuOpen={() => setNavOpen(true)} onHome={() => setView('library')} />
      <NavDrawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        currentView={view}
        onNavigate={(v) => { navigate(v); setNavOpen(false); }}
      />
      <main className="app-main">
        <ViewComponent onPlay={handlePlay} onNavigate={navigate} viewParams={viewParams} />
      </main>
      {newBadges.map(badge => (
        <BadgeToast key={badge.id} badge={badge} onDismiss={() => setNewBadges(b => b.filter(x => x.id !== badge.id))} />
      ))}
    </div>
  );
}

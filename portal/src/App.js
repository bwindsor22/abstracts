import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import Header from './components/Header';
import NavDrawer from './components/NavDrawer';
import GameWrapper from './components/GameWrapper';
import BadgeToast from './components/BadgeToast';
import AuthModal from './components/AuthModal';
import Library from './views/Library';
import MatchHistory from './views/MatchHistory';
import EloTrends from './views/EloTrends';
import Badges from './views/Badges';
import Profile from './views/Profile';
import { addResult, checkAndAwardBadges } from './utils/storage';
import { ALL_BADGES } from './data/badges';
import Leaderboard from './views/Leaderboard';
import BugReport from './components/BugReport';
import {
  supabase,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  pushResult,
  pushBadge,
  syncFromCloud,
  pushLocalToCloud,
  ensureProfile,
  getUsername,
} from './utils/supabase';

// Map old view IDs to URL paths
const VIEW_PATHS = {
  library: '/',
  history: '/history',
  elo: '/elo',
  badges: '/badges',
  profile: '/profile',
  leaderboard: '/leaderboard',
};

// Reverse: path to view ID (for nav drawer active state)
const PATH_TO_VIEW = Object.fromEntries(
  Object.entries(VIEW_PATHS).map(([k, v]) => [v, k])
);

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [newBadges, setNewBadges] = useState([]);
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('Guest');
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState(null);
  const pendingResult = useRef(null);

  const currentView = PATH_TO_VIEW[location.pathname] || (location.pathname.startsWith('/game/') ? 'game' : 'library');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        ensureProfile(u).catch(() => {});
        getUsername(u).then(setDisplayName).catch(() => {});
        syncFromCloud(u.id).catch(() => {});
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) {
        ensureProfile(newUser).catch(() => {});
        getUsername(newUser).then(setDisplayName).catch(() => {});
        syncFromCloud(newUser.id).then(() => {
          if (pendingResult.current) {
            const result = pendingResult.current;
            pendingResult.current = null;
            addResult(result);
            const earned = checkAndAwardBadges(ALL_BADGES);
            if (earned.length > 0) setNewBadges(earned);
            pushResult(newUser.id, result).catch(() => {});
            for (const badge of earned) {
              pushBadge(newUser.id, badge.id, Date.now()).catch(() => {});
            }
          }
        }).catch(() => {});
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleNavigation = useCallback((viewId) => {
    const path = VIEW_PATHS[viewId] || '/';
    navigate(path);
    setNavOpen(false);
  }, [navigate]);

  const handlePlay = useCallback((game) => {
    navigate(`/game/${game.id}`);
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleResult = useCallback((data) => {
    const result = {
      gameId: data.gameId,
      gameName: data.gameName,
      won: !!data.won,
      moves: data.moves || 0,
      difficulty: data.difficulty || 'medium',
      timestamp: Date.now(),
    };

    if (user) {
      addResult(result);
      const earned = checkAndAwardBadges(ALL_BADGES);
      if (earned.length > 0) setNewBadges(earned);
      pushResult(user.id, result).catch(() => {});
      for (const badge of earned) {
        pushBadge(user.id, badge.id, Date.now()).catch(() => {});
      }
    } else {
      pendingResult.current = result;
      setAuthReason('game-end');
      setAuthOpen(true);
    }
  }, [user]);

  const handleSignIn = useCallback(async (email, password) => {
    await signInWithEmail(email, password);
  }, []);

  const handleSignUp = useCallback(async (email, password, username) => {
    await signUpWithEmail(email, password, username);
  }, []);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, []);

  const handleImportGuest = useCallback(async () => {
    if (user) {
      await pushLocalToCloud(user.id);
      await syncFromCloud(user.id);
    }
  }, [user]);

  const handleAuthClose = useCallback(() => {
    if (authReason === 'game-end' && pendingResult.current) {
      addResult(pendingResult.current);
      const earned = checkAndAwardBadges(ALL_BADGES);
      if (earned.length > 0) setNewBadges(earned);
      pendingResult.current = null;
    }
    setAuthOpen(false);
    setAuthReason(null);
  }, [authReason]);

  return (
    <Routes>
      <Route path="/game/:gameId" element={
        <GameWrapper onBack={handleBack} onResult={handleResult} />
      } />
      <Route path="*" element={
        <div className="app-root">
          <div className="fluid-glow fixed-bg" />
          <Header onMenuOpen={() => setNavOpen(true)} />
          <NavDrawer
            open={navOpen}
            onClose={() => setNavOpen(false)}
            currentView={currentView}
            onNavigate={handleNavigation}
            user={user}
            displayName={displayName}
            onSignInClick={() => { setNavOpen(false); setAuthOpen(true); }}
            onSignOut={handleSignOut}
            onImportGuest={handleImportGuest}
          />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<Library onPlay={handlePlay} />} />
              <Route path="/history" element={<MatchHistory user={user} />} />
              <Route path="/elo" element={<EloTrends user={user} />} />
              <Route path="/badges" element={<Badges user={user} />} />
              <Route path="/profile" element={<Profile user={user} />} />
              <Route path="/leaderboard" element={<Leaderboard user={user} />} />
              <Route path="*" element={<Library onPlay={handlePlay} />} />
            </Routes>
          </main>
          {newBadges.map(badge => (
            <BadgeToast key={badge.id} badge={badge} onDismiss={() => setNewBadges(b => b.filter(x => x.id !== badge.id))} />
          ))}
          <AuthModal
            open={authOpen}
            onClose={handleAuthClose}
            onSignIn={handleSignIn}
            onSignUp={handleSignUp}
            reason={authReason}
          />
          <BugReport />
        </div>
      } />
    </Routes>
  );
}

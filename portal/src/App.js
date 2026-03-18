import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import {
  supabase,
  signInWithEmail,
  signUpWithEmail,
  signOut,
  pushResult,
  pushBadge,
  syncFromCloud,
  pushLocalToCloud,
} from './utils/supabase';

export default function App() {
  const [view, setView] = useState('library');
  const [viewParams, setViewParams] = useState(null);
  const [playingGame, setPlayingGame] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [newBadges, setNewBadges] = useState([]);
  const [user, setUser] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authReason, setAuthReason] = useState(null); // 'game-end' | null
  const pendingResult = useRef(null);

  // Listen for auth state changes
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        syncFromCloud(session.user.id).catch(() => {});
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) {
        syncFromCloud(newUser.id).then(() => {
          // If there's a pending result from a game that just ended, save it now
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

  const navigate = useCallback((v, params) => {
    setView(v);
    setViewParams(params || null);
  }, []);

  const handlePlay = useCallback((game) => {
    setPlayingGame(game);
  }, []);

  const handleBack = useCallback(() => {
    setPlayingGame(null);
  }, []);

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
      // Signed in — save immediately
      addResult(result);
      const earned = checkAndAwardBadges(ALL_BADGES);
      if (earned.length > 0) setNewBadges(earned);
      pushResult(user.id, result).catch(() => {});
      for (const badge of earned) {
        pushBadge(user.id, badge.id, Date.now()).catch(() => {});
      }
    } else {
      // Not signed in — hold the result and prompt sign-in
      pendingResult.current = result;
      setAuthReason('game-end');
      setAuthOpen(true);
    }
  }, [user]);

  const handleSignIn = useCallback(async (email, password) => {
    await signInWithEmail(email, password);
    // onAuthStateChange handles saving pendingResult
  }, []);

  const handleSignUp = useCallback(async (email, password) => {
    await signUpWithEmail(email, password);
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
    // If they dismiss the sign-in prompt after a game, save result locally anyway
    if (authReason === 'game-end' && pendingResult.current) {
      addResult(pendingResult.current);
      const earned = checkAndAwardBadges(ALL_BADGES);
      if (earned.length > 0) setNewBadges(earned);
      pendingResult.current = null;
    }
    setAuthOpen(false);
    setAuthReason(null);
  }, [authReason]);

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
        user={user}
        onSignInClick={() => { setNavOpen(false); setAuthOpen(true); }}
        onSignOut={handleSignOut}
        onImportGuest={handleImportGuest}
      />
      <main className="app-main">
        <ViewComponent
          onPlay={handlePlay}
          onNavigate={navigate}
          viewParams={viewParams}
          user={user}
        />
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
    </div>
  );
}

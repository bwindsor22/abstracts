import React, { useState } from 'react';
import './AuthModal.css';

export default function AuthModal({ open, onClose, onSignIn, onSignUp, reason }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        await onSignIn(email, password);
        onClose();
      } else {
        await onSignUp(email, password);
        setSignupDone(true);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setEmail('');
    setPassword('');
    setError('');
    setSignupDone(false);
    setMode('signin');
    onClose();
  };

  return (
    <div className="auth-overlay" onClick={resetAndClose}>
      <div className="auth-modal" onClick={e => e.stopPropagation()}>
        <button className="auth-close" onClick={resetAndClose} aria-label="Close">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>

        <h2 className="auth-title">{mode === 'signin' ? 'Sign In' : 'Create Account'}</h2>
        <p className="auth-subtitle">
          {reason === 'game-end'
            ? 'Sign in to save your result, earn badges, and track your Elo rating'
            : mode === 'signin'
              ? 'Sign in to sync your stats across devices'
              : 'Create an account to save your progress'}
        </p>
        {reason === 'game-end' && (
          <button className="auth-skip-btn" onClick={resetAndClose}>
            Skip — continue as guest
          </button>
        )}

        {signupDone ? (
          <div className="auth-success">
            <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--primary)' }}>check_circle</span>
            <p>Check your email to confirm your account, then sign in.</p>
            <button className="auth-btn auth-btn-primary" onClick={() => { setSignupDone(false); setMode('signin'); }}>
              Go to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-label">
              Email
              <input
                type="email"
                className="auth-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label className="auth-label">
              Password
              <input
                type="password"
                className="auth-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                placeholder="At least 6 characters"
              />
            </label>

            {error && <div className="auth-error">{error}</div>}

            <button type="submit" className="auth-btn auth-btn-primary" disabled={loading}>
              {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        )}

        {!signupDone && (
          <p className="auth-toggle">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              className="auth-toggle-btn"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
            >
              {mode === 'signin' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

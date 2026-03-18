import React from 'react';
import './NavDrawer.css';

const NAV_ITEMS = [
  {
    id: 'library',
    title: 'Home',
    subtitle: 'Browse all games',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: 'profile',
    title: 'Profile',
    subtitle: 'Your stats',
    icon: (
      <svg viewBox="0 0 24 24">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    id: 'history',
    title: 'Match History',
    subtitle: 'Recent games',
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'elo',
    title: 'ELO Trends',
    subtitle: 'Rating over time',
    icon: (
      <svg viewBox="0 0 24 24">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: 'badges',
    title: 'Badges',
    subtitle: 'Achievements',
    icon: (
      <svg viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="6" />
        <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
  },
];

export default function NavDrawer({ open, onClose, currentView, onNavigate, user, onSignInClick, onSignOut, onImportGuest }) {
  const displayName = user?.email?.split('@')[0] || null;

  return (
    <div className={`nav-drawer-overlay${open ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="Navigation menu">
      <div className="nav-drawer-backdrop" onClick={onClose} />
      <nav className="nav-drawer-panel">
        <div className="nav-drawer-header">
          <span className="nav-drawer-title">NAVIGATION</span>
          <button className="nav-drawer-close" onClick={onClose} aria-label="Close menu">
            <svg viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="nav-drawer-items">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-drawer-item${currentView === item.id ? ' active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <div className="nav-drawer-item-icon">
                {item.icon}
              </div>
              <div className="nav-drawer-item-text">
                <span className="nav-drawer-item-title">{item.title}</span>
                <span className="nav-drawer-item-subtitle">{item.subtitle}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="nav-drawer-footer">
          {user ? (
            <div className="nav-drawer-auth-section">
              <div className="nav-drawer-user">
                <span className="material-symbols-outlined nav-drawer-user-icon">person</span>
                <span className="nav-drawer-user-name">{displayName}</span>
              </div>
              <div className="nav-drawer-auth-actions">
                <button className="nav-drawer-auth-btn" onClick={onImportGuest}>
                  Import guest data
                </button>
                <button className="nav-drawer-auth-btn nav-drawer-signout" onClick={onSignOut}>
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            <button className="nav-drawer-signin-btn" onClick={onSignInClick}>
              <svg viewBox="0 0 24 24">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Sign In
            </button>
          )}
          <span className="nav-drawer-footer-text">ABSTRACTS</span>
        </div>
      </nav>
    </div>
  );
}

import React from 'react';
import './Header.css';

export default function Header({ onMenuOpen, onHome }) {
  return (
    <header className="portal-header">
      <div className="portal-header-inner">
        <div className="portal-logo" onClick={onHome} style={{ cursor: 'pointer' }}>
          <div className="portal-logo-icon">
            {/* Strategy/tactics icon */}
            <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 2L3 6v8l7 4 7-4V6L10 2zm0 2.2L15.5 7 10 9.8 4.5 7 10 4.2zM4 8.4l5.5 3.1V16.6L4 13.5V8.4zm7.5 8.2V11.5L17 8.4v5.1l-5.5 3.1z" />
            </svg>
          </div>
          <span className="portal-logo-text">ABSTRACTS</span>
        </div>
        <button className="portal-menu-btn" onClick={onMenuOpen} aria-label="Open menu">
          <svg viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  );
}

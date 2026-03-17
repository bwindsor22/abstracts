import React from 'react';
import './WinOverlay.css';

export default function WinOverlay({ title, subtitle, onNewGame, onHome }) {
  return (
    <div className="win-overlay">
      <div className="win-banner">
        <div className="win-title">{title}</div>
        {subtitle && <div className="win-subtitle">{subtitle}</div>}
        <button className="win-btn-primary" onClick={onNewGame}>New Game</button>
        {onHome && <button className="win-btn-secondary" onClick={onHome}>← Home</button>}
      </div>
    </div>
  );
}

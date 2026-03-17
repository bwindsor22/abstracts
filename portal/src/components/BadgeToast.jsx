import React, { useEffect, useState } from 'react';
import './BadgeToast.css';

export default function BadgeToast({ badge, onDismiss }) {
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDismissing(true);
      setTimeout(onDismiss, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleClick = () => {
    setDismissing(true);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={`badge-toast${dismissing ? ' dismissing' : ''}`}
      onClick={handleClick}
      role="status"
      aria-live="polite"
    >
      {badge.image ? (
        <img src={badge.image} alt={badge.name} className="badge-toast-img" />
      ) : (
        <span className="badge-toast-icon material-symbols-outlined">{badge.icon}</span>
      )}
      <div className="badge-toast-body">
        <span className="badge-toast-label">BADGE EARNED!</span>
        <span className="badge-toast-name">{badge.name}</span>
        <span className="badge-toast-desc">{badge.description}</span>
      </div>
      <div className="badge-toast-progress" />
    </div>
  );
}

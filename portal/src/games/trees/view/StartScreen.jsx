import React, { useState } from 'react';

const DIFFICULTIES = [
  { id: 'easy',   label: 'Easy' },
  { id: 'medium', label: 'Medium' },
  { id: 'hard',   label: 'Hard' },
  { id: 'expert', label: 'Expert' },
];

const pill = (active) => ({
  padding: '8px 16px',
  borderRadius: '999px',
  border: active ? 'none' : '1px solid rgba(45,122,71,0.3)',
  background: active ? '#2d7a47' : 'rgba(45,122,71,0.15)',
  color: active ? '#fff' : 'rgba(255,255,255,0.8)',
  cursor: 'pointer',
  fontSize: '13px',
  fontFamily: "'Space Grotesk', sans-serif",
  fontWeight: active ? '600' : '400',
  transition: 'all 0.15s',
  whiteSpace: 'nowrap',
});

const sectionLabel = {
  fontSize: '12px',
  color: 'rgba(255,255,255,0.5)',
  letterSpacing: '0.08em',
  marginBottom: '8px',
  fontFamily: "'Space Grotesk', sans-serif",
  textTransform: 'uppercase',
};

const StartScreen = ({ onStart, onBack }) => {
  const [numAI, setNumAI] = useState(1);
  const [rounds, setRounds] = useState(3);
  const [difficulty, setDifficulty] = useState('medium');

  // Keep color pinned to green for this redesign — color picker removed for cleaner UI
  // but still passed to onStart for game logic compatibility
  const color = 'green';

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #0a2e1a 0%, #1a4a2a 40%, #0d3520 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Space Grotesk', sans-serif",
      position: 'relative',
    }}>
      {/* Blurred overlay */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(4px)',
      }} />

      {/* Top bar buttons */}
      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(45,122,71,0.15)',
            border: '1px solid rgba(45,122,71,0.3)',
            color: 'rgba(255,255,255,0.8)',
            borderRadius: '999px',
            padding: '6px 14px',
            cursor: 'pointer',
            fontSize: '13px',
            fontFamily: "'Space Grotesk', sans-serif",
            zIndex: 2,
          }}
        >
          × TREES
        </button>
      )}

      {/* Content panel */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: '480px',
        width: '100%',
        padding: '0 24px',
      }}>
        {/* Mode chip */}
        <div style={{
          display: 'inline-block',
          background: 'rgba(45,122,71,0.25)',
          border: '1px solid rgba(45,122,71,0.4)',
          borderRadius: '999px',
          padding: '4px 12px',
          fontSize: '11px',
          color: 'rgba(255,255,255,0.7)',
          letterSpacing: '0.1em',
          marginBottom: '16px',
          fontFamily: "'Space Grotesk', sans-serif",
        }}>
          CLASSIC MODE
        </div>

        {/* Title */}
        <h1 style={{
          margin: '0 0 8px',
          fontSize: '40px',
          fontWeight: '700',
          color: '#fff',
          lineHeight: 1.1,
        }}>
          Trees
        </h1>

        {/* Subtitle */}
        <p style={{
          margin: '0 0 36px',
          fontSize: '15px',
          color: 'rgba(255,255,255,0.65)',
          lineHeight: 1.5,
        }}>
          Grow your grove, harness the sun, and dominate the forest floor.
        </p>

        {/* Number of Players */}
        <div style={{ marginBottom: '24px' }}>
          <div style={sectionLabel}>Number of Players</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => setNumAI(n)}
                style={pill(numAI === n)}
              >
                {n === 1 ? '1v1 AI' : n === 2 ? '1v2 AI' : '1v3 AI'}
              </button>
            ))}
          </div>
        </div>

        {/* Match Duration */}
        <div style={{ marginBottom: '24px' }}>
          <div style={sectionLabel}>Match Duration</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => setRounds(3)} style={pill(rounds === 3)}>
              3 Rounds (Short Game ~15m)
            </button>
            <button onClick={() => setRounds(4)} style={pill(rounds === 4)}>
              4 Rounds (Full Game ~20m)
            </button>
          </div>
        </div>

        {/* AI Difficulty */}
        <div style={{ marginBottom: '40px' }}>
          <div style={sectionLabel}>AI Difficulty</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {DIFFICULTIES.map(d => (
              <button key={d.id} onClick={() => setDifficulty(d.id)} style={pill(difficulty === d.id)}>
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={() => onStart({ color, numAI, difficulty, rounds })}
          style={{
            width: '100%',
            padding: '16px',
            background: '#2d7a47',
            color: '#fff',
            border: 'none',
            borderRadius: '14px',
            fontSize: '17px',
            fontWeight: '700',
            fontFamily: "'Space Grotesk', sans-serif",
            cursor: 'pointer',
            letterSpacing: '0.02em',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#236038'}
          onMouseLeave={e => e.currentTarget.style.background = '#2d7a47'}
        >
          Start Forest
        </button>
      </div>
    </div>
  );
};

export default StartScreen;

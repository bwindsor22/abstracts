import React, { useState } from 'react';
import { GUIDES } from './guides';
import './GameGuide.css';

export default function GameGuide({ gameId }) {
  const slides = GUIDES[gameId];
  const [step, setStep] = useState(0);

  if (!slides || slides.length === 0) return null;

  return (
    <div className="game-guide">
      <div className="game-guide-slide">
        {slides[step].svg}
      </div>
      <div className="game-guide-caption">{slides[step].caption}</div>
      <div className="game-guide-nav">
        <button
          className="game-guide-arrow"
          disabled={step === 0}
          onClick={() => setStep(s => s - 1)}
          aria-label="Previous"
        >&#8249;</button>
        <div className="game-guide-dots">
          {slides.map((_, i) => (
            <button
              key={i}
              className={`game-guide-dot ${i === step ? 'active' : ''}`}
              onClick={() => setStep(i)}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
        <button
          className="game-guide-arrow"
          disabled={step === slides.length - 1}
          onClick={() => setStep(s => s + 1)}
          aria-label="Next"
        >&#8250;</button>
      </div>
    </div>
  );
}

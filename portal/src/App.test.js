import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the library with game cards', () => {
  render(<App />);
  expect(screen.getByText('ABSTRACTS')).toBeInTheDocument();
  expect(screen.getByText('Modern Marvels')).toBeInTheDocument();
  expect(screen.getByText('Timeless Classics')).toBeInTheDocument();
});

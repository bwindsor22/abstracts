import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders the library with game cards', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByText('Modern Marvels')).toBeInTheDocument();
  expect(screen.getByText('Timeless Classics')).toBeInTheDocument();
});

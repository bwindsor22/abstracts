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
  expect(screen.getByText('Pick Up & Play')).toBeInTheDocument();
  expect(screen.getByText('Deep Systems')).toBeInTheDocument();
});

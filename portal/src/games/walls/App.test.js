import React from 'react';
import { render, screen } from '@testing-library/react';
import WallsApp from './App';

test('renders walls start screen', () => {
  render(<WallsApp />);
  expect(screen.getByText(/WALLS|QUORIDOR/i)).toBeInTheDocument();
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import HexesApp from './App';

test('renders hexes start screen', () => {
  render(<HexesApp />);
  expect(screen.getByText(/HEX/i)).toBeInTheDocument();
});

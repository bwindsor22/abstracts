import React from 'react';
import { render, screen } from '@testing-library/react';
import StonesApp from './App';

test('renders stones start screen', () => {
  render(<StonesApp />);
  expect(screen.getByText(/STONES|PENTE/i)).toBeInTheDocument();
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import BridgesApp from './App';

test('renders bridges start screen', () => {
  render(<BridgesApp />);
  expect(screen.getByText(/TWIXT|BRIDGES/i)).toBeInTheDocument();
});

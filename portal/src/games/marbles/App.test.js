import React from 'react';
import { render, screen } from '@testing-library/react';
import MarblesApp from './App';

test('renders marbles start screen', () => {
  render(<MarblesApp />);
  expect(screen.getByText(/MARBLES|ABALONE/i)).toBeInTheDocument();
});

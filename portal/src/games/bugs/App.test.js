import React from 'react';
import { render, screen } from '@testing-library/react';
import BugsApp from './App';

test('renders bugs start screen', () => {
  render(<BugsApp />);
  expect(screen.getByText(/BUGS|HIVE/i)).toBeInTheDocument();
});

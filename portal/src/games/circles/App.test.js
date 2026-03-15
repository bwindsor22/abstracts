import React from 'react';
import { render, screen } from '@testing-library/react';
import CirclesApp from './App';

test('renders circles start screen', () => {
  render(<CirclesApp />);
  expect(screen.getByText(/CIRCLES|YINSH/i)).toBeInTheDocument();
});

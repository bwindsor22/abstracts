import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@react-three/fiber', () => ({ Canvas: ({ children }) => <div data-testid="canvas">{children}</div> }));
jest.mock('@react-three/drei', () => ({ OrbitControls: () => null, Text: () => null, PerspectiveCamera: () => null }));

import TowersApp from './App';

test('renders towers start screen', () => {
  render(<TowersApp />);
  expect(screen.getByText(/TOWERS|SANTORINI/i)).toBeInTheDocument();
});

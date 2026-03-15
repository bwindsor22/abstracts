import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@react-three/fiber', () => ({ Canvas: ({ children }) => <div data-testid="canvas">{children}</div> }));
jest.mock('@react-three/drei', () => ({ OrbitControls: () => null, Text: () => null, PerspectiveCamera: () => null }));

import StacksApp from './App';

test('renders stacks start screen', () => {
  render(<StacksApp />);
  expect(screen.getByText(/STACKS|TAK/i)).toBeInTheDocument();
});

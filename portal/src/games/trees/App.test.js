import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@tensorflow/tfjs', () => ({
  ready: () => Promise.resolve(),
  loadLayersModel: () => Promise.resolve({ predict: () => ({ dataSync: () => [0] }) }),
}));

import TreesApp from './App';

test('renders trees start screen', () => {
  render(<TreesApp />);
  expect(screen.getByText(/TREES|PHOTOSYNTHESIS/i)).toBeInTheDocument();
});

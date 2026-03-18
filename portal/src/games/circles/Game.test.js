import { initState, placeRingSetup } from './Game';

test('placing a ring during setup updates the board', () => {
  const s = initState();
  const s2 = placeRingSetup(s, '0,0');
  expect(s2.board['0,0']).toEqual({ type: 'ring', owner: 'white' });
  expect(s2.currentPlayer).toBe('black');
});

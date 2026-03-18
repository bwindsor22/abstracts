import { initState, applyMove } from './Game';

test('placing a peg updates the board', () => {
  const s = initState();
  // red plays first, row 2 col 2 is a valid interior cell
  const s2 = applyMove(s, 2, 2);
  expect(s2.board['2,2']).toBe('red');
  expect(s2.currentPlayer).toBe('blue');
});

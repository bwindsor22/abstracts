import { initState, applyMove } from './Game';

test('placing a piece updates the board', () => {
  const s = initState();
  const s2 = applyMove(s, 5, 5);
  expect(s2.board[5][5]).toBe('red');
  expect(s2.currentPlayer).not.toBe(s.currentPlayer);
});

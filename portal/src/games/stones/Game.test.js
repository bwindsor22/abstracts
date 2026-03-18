import { initState, applyMove } from './Game';

test('placing a stone updates the board', () => {
  const s = initState();
  // First move must be center (9,9) in Pente
  const s2 = applyMove(s, 9, 9);
  expect(s2.board[9][9]).toBeTruthy();
  expect(s2.currentPlayer).not.toBe(s.currentPlayer);
});

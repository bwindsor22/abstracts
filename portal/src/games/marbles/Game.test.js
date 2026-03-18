import { initState, getAllMoves, applyMove } from './Game';

test('moving a marble group updates the board', () => {
  const s = initState();
  const moves = getAllMoves(s, 'black');
  expect(moves.length).toBeGreaterThan(0);
  const s2 = applyMove(s, moves[0]);
  expect(s2.board).not.toEqual(s.board);
  expect(s2.currentPlayer).toBe('white');
});

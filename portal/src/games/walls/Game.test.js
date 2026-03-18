import { initState, applyMove, getPawnMoves } from './Game';

test('moving a pawn updates its position', () => {
  const s = initState();
  const moves = getPawnMoves(s, s.currentPlayer);
  expect(moves.length).toBeGreaterThan(0);
  const s2 = applyMove(s, { type: 'move', ...moves[0] });
  expect(s2.pawns[s.currentPlayer]).not.toEqual(s.pawns[s.currentPlayer]);
});

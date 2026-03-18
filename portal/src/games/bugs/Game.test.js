import { initState, applyMove } from './Game';

test('placing first piece updates the board', () => {
  const s = initState();
  const move = { type: 'place', pieceId: 'black_Q_0', q: 0, r: 0 };
  const s2 = applyMove(s, move);
  expect(s2.board['0,0'].length).toBe(1);
  expect(s2.board['0,0'][0].pieceId).toBe('black_Q_0');
});

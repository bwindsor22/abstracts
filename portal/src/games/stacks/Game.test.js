import { initState, applyPlace, cellIdx } from './Game';

test('placing a flat stone updates the board', () => {
  const s = initState();
  const s2 = applyPlace(s, 0, 0, 'flat');
  expect(s2.board[cellIdx(0, 0, 5)].length).toBe(1);
  expect(s2.board[cellIdx(0, 0, 5)][0].type).toBe('flat');
});

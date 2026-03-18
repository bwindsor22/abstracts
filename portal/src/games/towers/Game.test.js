import { initState, applySetup } from './Game';

test('placing a worker during setup updates workers', () => {
  const s = initState();
  const s2 = applySetup(s, 0, 0);
  expect(s2.workers.p1a).toEqual({ r: 0, c: 0 });
});

import { lapTable } from './lap-timer.types';

describe('lapTable', () => {
  it('formats each lap against the best lap', () => {
    const table = lapTable([
      { number: 1, startMs: 0, endMs: 72500, durationMs: 72500 },
      { number: 2, startMs: 72500, endMs: 143000, durationMs: 70500 },
      { number: 3, startMs: 143000, endMs: 214750, durationMs: 71750 }
    ]);

    expect(table).toEqual({
      best: '01:10.50',
      rows: [
        { number: 1, time: '01:12.50', deltaToBest: '+00:02.00', isBest: false },
        { number: 2, time: '01:10.50', deltaToBest: '±00:00.00', isBest: true },
        { number: 3, time: '01:11.75', deltaToBest: '+00:01.25', isBest: false }
      ]
    });
  });

  it('is null without laps', () => {
    expect(lapTable([])).toBeNull();
  });
});

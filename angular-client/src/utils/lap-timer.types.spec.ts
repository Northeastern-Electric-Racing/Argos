import { lapTable } from './lap-timer.types';

describe('lapTable', () => {
  it('formats each lap against the best lap, newest first', () => {
    const table = lapTable([
      { startMs: 0, endMs: 72500, durationMs: 72500 },
      { startMs: 72500, endMs: 143000, durationMs: 70500 },
      { startMs: 143000, endMs: 214750, durationMs: 71750 }
    ]);

    expect(table).toEqual({
      best: '01:10.50',
      rows: [
        { number: 3, time: '01:11.75', deltaToBest: '+00:01.25', isBest: false },
        { number: 2, time: '01:10.50', deltaToBest: '±00:00.00', isBest: true },
        { number: 1, time: '01:12.50', deltaToBest: '+00:02.00', isBest: false }
      ]
    });
  });

  it('is null without laps', () => {
    expect(lapTable([])).toBeNull();
  });
});

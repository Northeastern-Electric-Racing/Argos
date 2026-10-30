import { Scale, Tick } from 'chart.js';
import { buildLiveLineOptions, liveWindow, windowPoints } from './live-line-chart.utils';

describe('live line chart utils', () => {
  describe('liveWindow', () => {
    it('is undefined with no points', () => {
      expect(liveWindow([[], []], 10_000)).toBeUndefined();
    });

    it('spans all the points while they fit in the time range', () => {
      const line = [
        { x: 1_000, y: 1 },
        { x: 5_000, y: 2 }
      ];

      expect(liveWindow([line], 10_000)).toEqual({ min: 1_000, max: 5_000 });
    });

    it('slides to the last time range, ending at the latest point of any line', () => {
      const first = [
        { x: 1_000, y: 1 },
        { x: 20_000, y: 2 }
      ];
      const second = [
        { x: 2_000, y: 1 },
        { x: 25_000, y: 2 }
      ];

      expect(liveWindow([first, second], 10_000)).toEqual({ min: 15_000, max: 25_000 });
    });

    it('gives a single point a second of width', () => {
      expect(liveWindow([[{ x: 1_000, y: 1 }]], 10_000)).toEqual({ min: 500, max: 1_500 });
    });
  });

  describe('windowPoints', () => {
    const line = [
      { x: 1_000, y: 1 },
      { x: 2_000, y: 2 },
      { x: 3_000, y: 3 },
      { x: 4_000, y: 4 }
    ];

    it('keeps the points in the window and the one before it, so the line enters from the edge', () => {
      expect(windowPoints(line, 2_500)).toEqual([
        { x: 2_000, y: 2 },
        { x: 3_000, y: 3 },
        { x: 4_000, y: 4 }
      ]);
    });

    it('returns a copy, never the caller-owned array', () => {
      const points = windowPoints(line, 0);

      expect(points).toEqual(line);
      expect(points).not.toBe(line);
    });
  });

  it('labels each second on the time axis once, even when ticks are under a second apart', () => {
    // The ticks Chart.js puts on a single point's one-second window: its edges and every half second
    const at = (ms: number) => new Date(2026, 0, 1, 9, 5, 6, ms).getTime();
    const ticks: Tick[] = [at(800), at(1_000), at(1_500), at(1_800)].map((value) => ({ value }));
    const label = buildLiveLineOptions({ legend: false }).scales!['x']!.ticks!.callback!;

    expect(ticks.map((tick, index) => label.call({} as Scale, tick.value, index, ticks))).toEqual([
      '9:05:06',
      '9:05:07',
      '',
      ''
    ]);
  });
});

import {
  DAY_MS,
  buildDayBoundaries,
  formatCrosshairTime,
  formatTickMark,
  formatValue,
  gridStep,
  priceScaleIdFor,
  toChartTime,
  toLineData
} from './graph-chart.utils';

describe('graph-chart utils', () => {
  const t = (h: number, m = 0, s = 0, ms = 0, day = 14) => new Date(2026, 2, day, h, m, s, ms).getTime();

  describe('toLineData', () => {
    it('converts ms to fractional chart seconds', () => {
      expect(toLineData([{ x: 1500, y: 2 }])).toEqual([{ time: toChartTime(1500), value: 2 }]);
      expect(toChartTime(1500) as number).toBe(1.5);
    });

    it('keeps the latest value for a repeated timestamp so times stay strictly increasing', () => {
      const data = toLineData([
        { x: 1000, y: 1 },
        { x: 1000, y: 2 },
        { x: 2000, y: 3 }
      ]);
      expect(data.map((d) => d.value)).toEqual([2, 3]);
    });
  });

  describe('time labels', () => {
    it('shows milliseconds only for sub-second instants', () => {
      expect(formatTickMark(toChartTime(t(9, 26, 53)), false)).toBe('09:26:53');
      expect(formatTickMark(toChartTime(t(9, 26, 53, 589)), false)).toBe('09:26:53.589');
    });

    it('shows date and minute on multi-day ranges', () => {
      expect(formatTickMark(toChartTime(t(9, 5, 53, 589)), true)).toBe('3/14 09:05');
    });

    it('formats the crosshair time with date and milliseconds', () => {
      expect(formatCrosshairTime(toChartTime(t(9, 26, 53, 50)))).toBe('3/14/26, 09:26:53.050');
    });
  });

  it('formats values without trailing zeros', () => {
    expect(formatValue(12)).toBe('12');
    expect(formatValue(3.14159)).toBe('3.1416');
  });

  it('puts every series on the shared axis unless multiple y-axes are on', () => {
    expect([0, 1, 2].map((i) => priceScaleIdFor(i, false))).toEqual(['left', 'left', 'left']);
    expect([0, 1, 2].map((i) => priceScaleIdFor(i, true))).toEqual(['left', 'right', 'overlay-2']);
  });

  describe('gridStep', () => {
    it('picks the smallest round step that keeps the span within the bar budget', () => {
      expect(gridStep(30_000, 2000)).toBe(20);
      expect(gridStep(5 * 60_000, 2000)).toBe(200);
      expect(gridStep(50 * 60 * 60_000, 2000)).toBe(2 * 60_000);
      expect(gridStep(7 * DAY_MS, 2000)).toBe(10 * 60_000);
    });

    it('steps in whole days past the largest round step', () => {
      expect(gridStep(5000 * DAY_MS, 2000)).toBe(3 * DAY_MS);
    });
  });

  describe('buildDayBoundaries', () => {
    it('returns nothing for a range within a day', () => {
      expect(
        buildDayBoundaries([
          [
            { x: t(1), y: 0 },
            { x: t(1) + DAY_MS - 1, y: 0 }
          ]
        ])
      ).toEqual([]);
    });

    it('marks each local midnight across the series', () => {
      const boundaries = buildDayBoundaries([
        [
          { x: t(20, 0, 0, 0, 14), y: 0 },
          { x: t(8, 0, 0, 0, 15), y: 0 }
        ],
        [
          { x: t(7, 30, 0, 0, 15), y: 0 },
          { x: t(23, 0, 0, 0, 15), y: 0 }
        ]
      ]);
      expect(boundaries.map((b) => b.timeMs)).toEqual([t(0, 0, 0, 0, 15)]);
      expect(boundaries[0].label).toBe('Sun, Mar 15');
    });

    it('marks midnights inside a data gap too, since gaps keep their width', () => {
      const boundaries = buildDayBoundaries([
        [
          { x: t(10, 0, 0, 0, 14), y: 0 },
          { x: t(10, 0, 0, 0, 17), y: 0 }
        ]
      ]);
      expect(boundaries).toEqual([
        { timeMs: t(0, 0, 0, 0, 15), label: 'Sun, Mar 15' },
        { timeMs: t(0, 0, 0, 0, 16), label: 'Mon, Mar 16' },
        { timeMs: t(0, 0, 0, 0, 17), label: 'Tue, Mar 17' }
      ]);
    });
  });
});

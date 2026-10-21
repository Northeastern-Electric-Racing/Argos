import { TickMarkType, Time } from 'lightweight-charts';
import {
  DAY_MS,
  ZoneOffset,
  buildDayBoundaries,
  formatCrosshairTime,
  formatTickMark,
  formatValue,
  fromChartMs,
  fromChartTime,
  gridStep,
  priceScaleIdFor,
  toChartMs,
  toChartTime,
  toLineData
} from './graph-chart.utils';

const HOUR = 60 * 60 * 1000;
/** New York in 2026: EDT (UTC-4) from 3/8 07:00Z, EST (UTC-5) from 11/1 06:00Z. */
const SPRING_FORWARD = Date.UTC(2026, 2, 8, 7);
const FALL_BACK = Date.UTC(2026, 10, 1, 6);
const newYork: ZoneOffset = (ms) => (ms >= SPRING_FORWARD && ms < FALL_BACK ? -4 : -5) * HOUR;
/** A chart time that reads as this wall-clock time (the library places and labels ticks in UTC). */
const wall = (...args: [number, number, number, number?, number?, number?, number?]) => (Date.UTC(...args) / 1000) as Time;

describe('graph-chart utils', () => {
  const t = (h: number, m = 0, s = 0, ms = 0, day = 14) => new Date(2026, 2, day, h, m, s, ms).getTime();

  describe('toLineData', () => {
    it('converts ms to fractional chart seconds', () => {
      expect(toLineData([{ x: 1500, y: 2 }])).toEqual([{ time: toChartTime(1500), value: 2 }]);
      expect((toChartTime(2500) as number) - (toChartTime(1000) as number)).toBe(1.5);
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

  describe('chart time in the local time zone', () => {
    it('writes each instant as its local wall-clock time, so ticks land on local round times', () => {
      // 2026-10-16 12:00Z is 08:00 in New York.
      expect(toChartMs(Date.UTC(2026, 9, 16, 12), newYork)).toBe(Date.UTC(2026, 9, 16, 8));
      expect(toChartMs(Date.UTC(2026, 0, 16, 12), newYork)).toBe(Date.UTC(2026, 0, 16, 7));
      expect(toChartMs(Date.UTC(2026, 9, 16, 12), () => 0)).toBe(Date.UTC(2026, 9, 16, 12));
      // Local midnight, where the day lines go, is a whole day in chart time.
      expect(toChartMs(Date.UTC(2026, 9, 17, 4), newYork) % DAY_MS).toBe(0);
    });

    it('skips the missing hour where the clock springs forward', () => {
      expect(toChartMs(SPRING_FORWARD - 1, newYork)).toBe(Date.UTC(2026, 2, 8, 2) - 1);
      expect(toChartMs(SPRING_FORWARD, newYork)).toBe(Date.UTC(2026, 2, 8, 3));
    });

    it('stays strictly increasing where the clock falls back, and reads back the same instant', () => {
      for (const around of [SPRING_FORWARD, FALL_BACK]) {
        let previous = -Infinity;
        for (let ms = around - 3 * HOUR; ms <= around + 3 * HOUR; ms += 61_001) {
          const chart = toChartMs(ms, newYork);
          expect(chart).toBeGreaterThan(previous);
          expect(fromChartMs(chart, newYork)).toBe(ms);
          previous = chart;
        }
      }
      // Local 01:00-02:00 happens twice; both hours are drawn, at half width, in its one hour.
      expect(toChartMs(FALL_BACK - HOUR, newYork)).toBe(Date.UTC(2026, 10, 1, 1));
      expect(toChartMs(FALL_BACK, newYork)).toBe(Date.UTC(2026, 10, 1, 1, 30));
      expect(toChartMs(FALL_BACK + HOUR, newYork)).toBe(Date.UTC(2026, 10, 1, 2));
    });
  });

  describe('time labels', () => {
    it('labels ticks with the wall-clock time the chart time encodes, milliseconds only when needed', () => {
      expect(formatTickMark(wall(2026, 9, 16, 9, 26, 53), TickMarkType.TimeWithSeconds)).toBe('09:26:53');
      expect(formatTickMark(wall(2026, 9, 16, 9, 26, 53, 589), TickMarkType.TimeWithSeconds)).toBe('09:26:53.589');
      expect(formatTickMark(wall(2026, 9, 16, 9, 27), TickMarkType.Time)).toBe('09:27');
    });

    it('leaves ticks off a whole second blank unless the view spans only a few seconds', () => {
      const offSecond = wall(2026, 9, 16, 9, 26, 53, 440);
      expect(formatTickMark(offSecond, TickMarkType.TimeWithSeconds, 30_000)).toBe('');
      expect(formatTickMark(offSecond, TickMarkType.TimeWithSeconds, 2_000)).toBe('09:26:53.440');
      expect(formatTickMark(wall(2026, 9, 16, 9, 26, 53), TickMarkType.TimeWithSeconds, 30_000)).toBe('09:26:53');
    });

    it('labels day ticks with the date, and the time too when not on midnight', () => {
      expect(formatTickMark(wall(2026, 9, 17), TickMarkType.DayOfMonth)).toBe('10/17');
      expect(formatTickMark(wall(2026, 9, 17, 0, 5), TickMarkType.DayOfMonth)).toBe('10/17 00:05');
      expect(formatTickMark(wall(2027, 0, 1), TickMarkType.Year)).toBe('1/1');
    });

    it('reads the crosshair time back in the local zone, even inside the repeated hour', () => {
      // 06:30Z on 11/1 is the second 01:30 in New York.
      const time = (toChartMs(FALL_BACK + HOUR / 2, newYork) / 1000) as Time;
      expect(fromChartTime(time, newYork)).toBe(FALL_BACK + HOUR / 2);
      expect(formatCrosshairTime(time, newYork)).toBe('11/1/26, 01:30:00');
    });

    it('reads the crosshair time off the axis inside the hour skipped where the clock springs forward', () => {
      // Chart times 02:00-03:00 on 3/8 match no instant in New York; they read as the axis labels them.
      const readings = [
        [1, 59],
        [2, 15],
        [2, 45],
        [3, 0]
      ].map(([h, m]) => formatCrosshairTime(wall(2026, 2, 8, h, m), newYork));
      expect(readings).toEqual(['3/8/26, 01:59:00', '3/8/26, 02:15:00', '3/8/26, 02:45:00', '3/8/26, 03:00:00']);
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

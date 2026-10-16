import { buildDayBoundaryAnnotations, buildYScales, computeDataSpan, DAY_MS, yAxisIdFor } from './graph-chart.utils';

const NO_LIMITS = { yMin: null, yMax: null };

describe('graph-chart utils', () => {
  describe('buildYScales (#630: y-axes match the selected topics)', () => {
    it('builds one shared y-axis when multi-axis is off', () => {
      const scales = buildYScales(['A 0', 'B 0'], false, NO_LIMITS);

      expect(Object.keys(scales)).toEqual(['y']);
    });

    it('builds one y-axis per topic when multi-axis is on', () => {
      const scales = buildYScales(['BMS/Pack/Voltage 0', 'BMS/Pack/Current 0'], true, NO_LIMITS);

      expect(Object.keys(scales)).toEqual(['y', 'y1']);
    });

    it('prunes a y-axis when its topic is deselected', () => {
      const scales = buildYScales(['BMS/Pack/Voltage 0'], true, NO_LIMITS);

      expect(Object.keys(scales)).toEqual(['y']);
      expect((scales['y'] as { title: { text: string } }).title.text).toBe('BMS/Pack/Voltage ');
    });

    it('alternates y-axis sides so stacked axes stay readable', () => {
      const scales = buildYScales(['A 0', 'B 0', 'C 0'], true, NO_LIMITS);

      const sides = Object.values(scales).map((s) => (s as { position: string }).position);
      expect(sides).toEqual(['left', 'right', 'left']);
    });

    it('applies the user y-limits to every axis', () => {
      const scales = buildYScales(['A 0', 'B 0'], true, { yMin: -5, yMax: 10 });

      for (const scale of Object.values(scales)) {
        expect((scale as { min: number }).min).toBe(-5);
        expect((scale as { max: number }).max).toBe(10);
      }
    });

    it('leaves the y-axis auto-fitting when no limits are set', () => {
      const scales = buildYScales(['A 0'], false, NO_LIMITS);

      expect((scales['y'] as { min?: number }).min).toBeUndefined();
      expect((scales['y'] as { max?: number }).max).toBeUndefined();
    });
  });

  it('maps every series to the shared axis unless multi-axis is on', () => {
    expect([0, 1, 2].map((i) => yAxisIdFor(i, false))).toEqual(['y', 'y', 'y']);
    expect([0, 1, 2].map((i) => yAxisIdFor(i, true))).toEqual(['y', 'y1', 'y2']);
  });

  describe('computeDataSpan', () => {
    it('spans the earliest to the latest point across series', () => {
      const span = computeDataSpan(
        new Map([
          [
            'A 0',
            [
              { x: 5, y: 0 },
              { x: 20, y: 0 }
            ]
          ],
          [
            'B 0',
            [
              { x: 2, y: 0 },
              { x: 9, y: 0 }
            ]
          ]
        ])
      );

      expect(span).toEqual({ minX: 2, maxX: 20, spanMs: 18 });
    });

    it('is null when there are no points', () => {
      expect(computeDataSpan(new Map([['A 0', []]]))).toBeNull();
    });
  });

  describe('buildDayBoundaryAnnotations', () => {
    it('draws a vertical line at each local midnight inside the span', () => {
      const start = new Date(2026, 0, 1, 12).getTime();
      const annotations = buildDayBoundaryAnnotations({ minX: start, maxX: start + 2 * DAY_MS });

      expect(annotations.map((a) => a.xMin)).toEqual([new Date(2026, 0, 2).getTime(), new Date(2026, 0, 3).getTime()]);
      expect(annotations.every((a) => a.xMin === a.xMax)).toBeTrue();
    });

    it('draws nothing inside a single day', () => {
      const start = new Date(2026, 0, 1, 1).getTime();

      expect(buildDayBoundaryAnnotations({ minX: start, maxX: start + 60 * 60 * 1000 })).toEqual([]);
    });
  });
});

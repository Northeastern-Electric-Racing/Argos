import {
  buildBaseOptions,
  buildDayBoundaryAnnotations,
  buildTimeTicks,
  buildYScales,
  computeDataSpan,
  DAY_MS,
  formatTimeTick,
  formatTooltipTime,
  pickTimeStep,
  SERIES_COLORS,
  yAxisIdFor
} from './graph-chart.utils';

const NO_LIMITS = { yMin: null, yMax: null };

describe('graph-chart utils', () => {
  describe('buildBaseOptions', () => {
    const options = buildBaseOptions({ onZoom: () => undefined });

    it('treats a click with a few pixels of jitter as a click, not a drag-zoom', () => {
      expect(options.plugins!.zoom!.zoom!.drag!.threshold).toBe(10);
    });

    it('never zooms the x-axis in past one second', () => {
      expect(options.plugins!.zoom!.limits!['x']!.minRange).toBe(1000);
    });

    it('hovers the point nearest the cursor in both x and y, not only the fastest topic', () => {
      expect(options.interaction!.axis).toBe('xy');
    });

    it('reserves room for the last x label so the plot does not jump sideways as ticks slide in', () => {
      expect((options.layout!.padding as { right: number }).right).toBeGreaterThanOrEqual(32);
    });

    it('draws text in the app font and the tooltip in the app theme', () => {
      expect(options.font!.family).toContain('Roboto');
      expect(options.plugins!.tooltip!.backgroundColor).toBe('#0c2026');
      expect(options.plugins!.tooltip!.borderColor).toBe('#8fcadd');
    });
  });

  it('gives at least ten topics distinct colors', () => {
    expect(new Set(SERIES_COLORS.slice(0, 10)).size).toBe(10);
  });

  describe('time ticks on the x-axis', () => {
    const at = (h: number, m = 0, s = 0, ms = 0) => new Date(2026, 9, 17, h, m, s, ms).getTime();

    it('picks a clock-friendly step for the span', () => {
      expect(pickTimeStep(10_000)).toBe(2_000);
      expect(pickTimeStep(30_000)).toBe(5_000);
      expect(pickTimeStep(5 * 60_000)).toBe(60_000);
      expect(pickTimeStep(150 * 60_000)).toBe(30 * 60_000);
      expect(pickTimeStep(50 * 60 * 60_000)).toBe(12 * 60 * 60_000);
    });

    it('puts ticks on whole multiples of the step, midnight and noon on a multi-day range', () => {
      expect(buildTimeTicks(at(13, 50, 21, 400), at(13, 50, 51, 400))).toEqual([
        at(13, 50, 25),
        at(13, 50, 30),
        at(13, 50, 35),
        at(13, 50, 40),
        at(13, 50, 45),
        at(13, 50, 50)
      ]);
      expect(buildTimeTicks(new Date(2026, 9, 16, 12, 7).getTime(), new Date(2026, 9, 18, 14, 7).getTime())).toEqual([
        new Date(2026, 9, 17).getTime(),
        at(12),
        new Date(2026, 9, 18).getTime(),
        new Date(2026, 9, 18, 12).getTime()
      ]);
    });

    it('keeps ticks put as the live window slides', () => {
      const before = buildTimeTicks(at(13, 50, 21), at(13, 50, 51));
      const after = buildTimeTicks(at(13, 50, 22, 500), at(13, 50, 52, 500));

      expect(after.filter((t) => t <= at(13, 50, 51))).toEqual(before.filter((t) => t >= at(13, 50, 22, 500)));
    });

    it('labels ticks as precisely as the step needs, dating midnights on long ranges', () => {
      expect(formatTimeTick(at(13, 50, 24, 120), 200)).toBe('13:50:24.120');
      expect(formatTimeTick(at(13, 50, 25), 5_000)).toBe('13:50:25');
      expect(formatTimeTick(at(13, 50), 60_000)).toBe('13:50');
      expect(formatTimeTick(at(0), 12 * 60 * 60_000)).toBe('10/17');
      expect(formatTimeTick(at(12), 12 * 60 * 60_000)).toBe('12:00');
    });

    it('titles the tooltip in 24-hour time, with milliseconds once the axis does', () => {
      expect(formatTooltipTime(at(13, 50, 24, 120), 30_000)).toBe('10/17/2026, 13:50:24');
      expect(formatTooltipTime(at(13, 50, 24, 120), 1_000)).toBe('10/17/2026, 13:50:24.120');
    });
  });

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
      expect((scales['y'] as { title: { text: string } }).title.text).toBe('BMS/Pack/Voltage');
    });

    it("titles each axis with its topic, dropping only the trailing value index ' 0'", () => {
      const scales = buildYScales(['BMS/Segment_Temp/0 0', 'Motor/Phase 1'], true, NO_LIMITS);

      const titles = Object.values(scales).map((s) => (s as { title: { text: string } }).title.text);
      expect(titles).toEqual(['BMS/Segment_Temp/0', 'Motor/Phase 1']);
    });

    it("colors each axis's title and ticks like its series", () => {
      const scales = buildYScales(['A 0', 'B 0'], true, NO_LIMITS, ['#111111', '#222222']);

      const colors = Object.values(scales).map((s) => s as { title: { color: string }; ticks: { color: string } });
      expect(colors.map((s) => s.title.color)).toEqual(['#111111', '#222222']);
      expect(colors.map((s) => s.ticks.color)).toEqual(['#111111', '#222222']);
    });

    it('hides the axis of a series hidden from the legend', () => {
      const scales = buildYScales(['A 0', 'B 0'], true, NO_LIMITS);

      for (const scale of Object.values(scales)) {
        expect((scale as { display: unknown }).display).toBe('auto');
      }
    });

    it('leaves headroom so lines at the extremes clear the plot border', () => {
      expect((buildYScales(['A 0'], false, NO_LIMITS)['y'] as { grace: string }).grace).toBe('5%');
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

    it('labels each day at the top of the plot, clear of the data and the x ticks', () => {
      const start = new Date(2026, 0, 1, 12).getTime();
      const [annotation] = buildDayBoundaryAnnotations({ minX: start, maxX: start + DAY_MS });

      expect(annotation.label!.position).toBe('end');
    });

    it('draws nothing inside a single day', () => {
      const start = new Date(2026, 0, 1, 1).getTime();

      expect(buildDayBoundaryAnnotations({ minX: start, maxX: start + 60 * 60 * 1000 })).toEqual([]);
    });
  });
});

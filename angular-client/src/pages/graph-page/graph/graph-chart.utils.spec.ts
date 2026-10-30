import {
  buildBaseOptions,
  buildCsv,
  buildDayBoundaryAnnotations,
  buildTimeTicks,
  buildYScales,
  computeDataSpan,
  DAY_MS,
  formatTimeTick,
  formatTooltipTime,
  HOVER_REACH_PERIODS,
  hoverSample,
  nearestIndex,
  nearestPerSeries,
  pickTimeStep,
  placeTooltip
} from './graph-chart.utils';

const NO_LIMITS = { yMin: null, yMax: null };

describe('graph-chart utils', () => {
  it('treats a click with a few pixels of jitter as a click, not a drag-zoom', () => {
    expect(buildBaseOptions({ onZoom: () => undefined }).plugins!.zoom!.zoom!.drag!.threshold).toBe(10);
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

    // DST changes in America/New_York, the zone test-setup.ts pins
    const dstRanges: [string, number, number][] = [
      ['spring forward, 30 min steps', new Date(2026, 2, 8, 1).getTime(), new Date(2026, 2, 8, 4).getTime()],
      ['spring forward, 1 h steps', new Date(2026, 2, 8, 0).getTime(), new Date(2026, 2, 8, 5).getTime()],
      ['fall back, 30 min steps', new Date(2026, 10, 1, 0).getTime(), new Date(2026, 10, 1, 3).getTime()],
      ['fall back, days', new Date(2026, 9, 30).getTime(), new Date(2026, 10, 3).getTime()]
    ];
    it('keeps ticks strictly increasing across a DST change', () => {
      for (const [name, min, max] of dstRanges) {
        const ticks = buildTimeTicks(min, max);

        expect(ticks.length, name).toBeGreaterThan(1);
        expect(
          ticks.filter((t, i) => i > 0 && t <= ticks[i - 1]),
          name
        ).toEqual([]);
      }
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
      expect(formatTooltipTime(at(13, 50, 24, 120), 1_000, false)).toBe('13:50:24.120');
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

    it("titles each axis with its topic, dropping only the trailing value index ' 0'", () => {
      const scales = buildYScales(['BMS/Segment_Temp/0 0', 'Motor/Phase 1'], true, NO_LIMITS);

      const titles = Object.values(scales).map((s) => (s as { title: { text: string } }).title.text);
      expect(titles).toEqual(['BMS/Segment_Temp/0', 'Motor/Phase 1']);
    });

    it('applies the user y-limits to every axis, and auto-fits when none are set', () => {
      const limited = Object.values(buildYScales(['A 0', 'B 0'], true, { yMin: -5, yMax: 10 }));
      const unlimited = buildYScales(['A 0'], false, NO_LIMITS)['y'] as { min?: number; max?: number };

      expect(limited.map((s) => [(s as { min: number }).min, (s as { max: number }).max])).toEqual([
        [-5, 10],
        [-5, 10]
      ]);
      expect([unlimited.min, unlimited.max]).toEqual([undefined, undefined]);
    });
  });

  describe('computeDataSpan', () => {
    it('spans the earliest to the latest point across series, and is null with no points', () => {
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
      expect(computeDataSpan(new Map([['A 0', []]]))).toBeNull();
    });
  });

  describe('buildDayBoundaryAnnotations', () => {
    it('draws a vertical line at each local midnight inside the span', () => {
      const start = new Date(2026, 0, 1, 12).getTime();
      const annotations = buildDayBoundaryAnnotations({ minX: start, maxX: start + 2 * DAY_MS });

      expect(annotations.map((a) => a.xMin)).toEqual([new Date(2026, 0, 2).getTime(), new Date(2026, 0, 3).getTime()]);
      expect(annotations.every((a) => a.xMin === a.xMax)).toBe(true);
    });

    it('keeps each line on its own local midnight across a DST change', () => {
      for (const [name, minX, maxX] of [
        ['spring forward', new Date(2026, 2, 6, 12).getTime(), new Date(2026, 2, 10, 12).getTime()],
        ['fall back', new Date(2026, 9, 30, 12).getTime(), new Date(2026, 10, 3, 12).getTime()]
      ] as const) {
        const annotations = buildDayBoundaryAnnotations({ minX, maxX });

        expect(
          annotations.map((a) => new Date(a.xMin as number).getHours()),
          name
        ).toEqual([0, 0, 0, 0]);
        expect(new Set(annotations.map((a) => a.label!.content)).size, name).toBe(4);
      }
    });
  });

  describe('nearestIndex', () => {
    const points = [{ x: 10 }, { x: 20 }, { x: 30 }];

    it('picks the closer neighbour between two samples, the earlier one on a tie', () => {
      expect(nearestIndex(points, 20)).toBe(1);
      expect(nearestIndex(points, 24)).toBe(1);
      expect(nearestIndex(points, 26)).toBe(2);
      expect(nearestIndex(points, 25)).toBe(1);
    });

    it('clamps to the first or last sample outside the data, and is -1 for an empty series', () => {
      expect(nearestIndex(points, -5)).toBe(0);
      expect(nearestIndex(points, 99)).toBe(2);
      expect(nearestIndex([], 5)).toBe(-1);
    });
  });

  describe('hoverSample', () => {
    /** Samples every `period` ms from `from` to `to` inclusive, alternating 0 and 1 like a flag topic. */
    const steady = (from: number, to: number, period = 10) =>
      Array.from({ length: (to - from) / period + 1 }, (_, i) => ({ x: from + i * period, y: i % 2 }));

    it('is the nearest real sample, never a value interpolated between two', () => {
      const flag = steady(0, 100);

      expect(hoverSample(flag, 14)).toEqual({ x: 10, y: 1 });
      expect(hoverSample(flag, 16)).toEqual({ x: 20, y: 0 });
      expect(hoverSample(flag, 15)).toEqual({ x: 10, y: 1 });
    });

    it(`reaches ${HOVER_REACH_PERIODS} sample periods into a gap or past either end, and finds nothing past that`, () => {
      // Every 10 ms, then nothing from 50 to 200
      const points = [...steady(0, 50), ...steady(200, 250)];

      expect(hoverSample(points, 70)).toEqual({ x: 50, y: 1 });
      expect(hoverSample(points, 75)).toBeNull();
      expect(hoverSample(points, 125)).toBeNull();
      expect(hoverSample(points, 180)).toEqual({ x: 200, y: 0 });
      expect(hoverSample(points, -15)).toEqual({ x: 0, y: 0 });
      expect(hoverSample(points, -25)).toBeNull();
      expect(hoverSample(points, 270)).toEqual({ x: 250, y: 1 });
      expect(hoverSample(points, 275)).toBeNull();
    });

    it("judges a gap by the series' own period, so a sparse series still shows between its samples", () => {
      const sparse = [
        { x: 0, y: 1 },
        { x: 1000, y: 2 },
        { x: 2000, y: 3 }
      ];

      expect(hoverSample(sparse, 1400)).toEqual({ x: 1000, y: 2 });
    });

    it('reaches at least `snap` from a sample, so a lone sample can be hovered', () => {
      expect(hoverSample([{ x: 100, y: 5 }], 104, 5)).toEqual({ x: 100, y: 5 });
      expect(hoverSample([{ x: 100, y: 5 }], 106, 5)).toBeNull();
    });
  });

  describe('nearestPerSeries', () => {
    // The x scale maps pixel p to time 10 * p across a 40 px plot
    const fakeChart = (series: { x: number; y: number }[][], drawn: { x: number; y: number }[][]) =>
      ({
        isPointInArea: ({ x, y }: { x: number; y: number }) => x >= 0 && x <= 40 && y >= 0 && y <= 40,
        scales: {
          x: {
            min: 0,
            max: 400,
            width: 40,
            getValueForPixel: (px: number) => px * 10,
            getPixelForValue: (t: number) => t / 10
          },
          y: { getPixelForValue: (v: number) => 40 - v }
        },
        data: { datasets: series.map((data) => ({ data })) },
        getDatasetMeta: () => ({ yAxisID: 'y' }),
        getSortedVisibleDatasetMetas: () =>
          drawn.map((points, index) => ({ index, data: points.map((point) => ({ point })) }))
      }) as never;
    const at = (x: number) => ({ native: null, type: 'mousemove', x, y: 20 }) as never;

    it('keeps a series whose newest sample arrived after the last frame drew it', () => {
      const series = [
        { x: 100, y: 1 },
        { x: 200, y: 2 },
        { x: 300, y: 3 }
      ];

      const items = nearestPerSeries(fakeChart([series], [series.slice(0, 2)]), at(30), {} as never);

      expect(items.map(({ datasetIndex, index }) => [datasetIndex, index])).toEqual([[0, 1]]);
      expect(items[0].element).toEqual({ point: series[1] } as never);
    });
  });

  describe('buildCsv', () => {
    const iso = (t: number) => new Date(t).toISOString();

    it('writes a time column, then one column per series, in series order', () => {
      const csv = buildCsv(
        new Map([
          ['V 0', [{ x: 1000, y: 400 }]],
          ['I 0', [{ x: 1000, y: 20 }]]
        ])
      );

      expect(csv).toBe(`time,V,I\r\n${iso(1000)},400,20\r\n`);
    });

    it('merges series on their own timestamps, leaving a cell blank where a series has no sample', () => {
      const csv = buildCsv(
        new Map([
          [
            'A',
            [
              { x: 1000, y: 1 },
              { x: 3000, y: 3 }
            ]
          ],
          ['B', [{ x: 2000, y: 2 }]]
        ])
      );

      expect(csv.split('\r\n')).toEqual(['time,A,B', `${iso(1000)},1,`, `${iso(2000)},,2`, `${iso(3000)},3,`, '']);
    });

    it('keeps every sample, even two of one series at the same time', () => {
      const csv = buildCsv(
        new Map([
          [
            'A',
            [
              { x: 1000, y: 1 },
              { x: 1000, y: 2 }
            ]
          ]
        ])
      );

      expect(csv.split('\r\n').slice(1, 3)).toEqual([`${iso(1000)},1`, `${iso(1000)},2`]);
    });

    it('quotes series names and keeps a spreadsheet from running one as a formula, but leaves negative values numbers', () => {
      const csv = buildCsv(
        new Map([
          ['=HYPERLINK("x") 0', [{ x: 1000, y: -1.5 }]],
          ['+A 0', []],
          ['-B 0', []],
          ['@C 0', []],
          ['a,b 0', []]
        ])
      );

      expect(csv.split('\r\n').slice(0, 2)).toEqual([
        `time,"'=HYPERLINK(""x"")",'+A,'-B,'@C,"a,b"`,
        `${iso(1000)},-1.5,,,,`
      ]);
    });
  });

  describe('placeTooltip', () => {
    const area = { left: 0, top: 0, right: 400, bottom: 300 };

    it('sits below-right of the cursor, flipping to its other side near the right and bottom edges', () => {
      expect(placeTooltip({ x: 100, y: 100 }, { width: 50, height: 20 }, area)).toEqual({
        x: 112,
        y: 112,
        xAlign: 'left',
        yAlign: 'top'
      });
      expect(placeTooltip({ x: 380, y: 290 }, { width: 50, height: 20 }, area)).toEqual({
        x: 368,
        y: 278,
        xAlign: 'right',
        yAlign: 'bottom'
      });
    });
  });
});

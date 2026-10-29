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
  HOVER_SNAP_PX,
  lineValueAt,
  nearestIndex,
  nearestPerSeries,
  pickTimeStep,
  placeTooltip,
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

    it("hovers every series at the cursor's time, with one tooltip that follows the cursor", () => {
      expect(options.interaction!.mode).toBe('nearestPerSeries');
      expect(options.plugins!.tooltip!.position).toBe('cursor');
    });

    it('reserves room for the last x label so the plot does not jump sideways as ticks slide in', () => {
      expect((options.layout!.padding as { right: number }).right).toBeGreaterThanOrEqual(32);
    });

    it('shows a pointer over legend items, which toggle their series', () => {
      const legend = options.plugins!.legend!;
      const canvas = document.createElement('canvas');
      const event = { native: { target: canvas } } as never;

      legend.onHover!.call(undefined as never, event, undefined as never, undefined as never);
      expect(canvas.style.cursor).toBe('pointer');
      legend.onLeave!.call(undefined as never, event, undefined as never, undefined as never);
      expect(canvas.style.cursor).toBe('');
    });

    it('hides the x-axis until there is data', () => {
      expect(options.scales!['x']!.display).toBe(false);
    });

    it('draws text in the app font and a dark grey tooltip with round series swatches', () => {
      expect(options.font!.family).toContain('Roboto');
      expect(options.plugins!.tooltip!.backgroundColor).toBe('rgba(30, 30, 30, 0.92)');
      expect(options.plugins!.tooltip!.usePointStyle).toBe(true);
    });
  });

  it('gives at least ten topics distinct colors', () => {
    expect(new Set(SERIES_COLORS.slice(0, 10)).size).toBe(10);
  });

  it('keeps every series color legible as axis text on the page background (WCAG AA, 4.5:1)', () => {
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    // --color-background-page (styles.css)
    const page = luminance('#101010');

    const tooDark = SERIES_COLORS.filter((color) => (luminance(color) + 0.05) / (page + 0.05) < 4.5);
    expect(tooDark).toEqual([]);
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

    // DST changes in America/New_York, where the team runs the client. In a zone without them (UTC CI) these
    // hold trivially; run Karma with TZ=America/New_York to exercise them.
    const dstRanges: [string, number, number][] = [
      ['spring forward, 30 min steps', new Date(2026, 2, 8, 1).getTime(), new Date(2026, 2, 8, 4).getTime()],
      ['spring forward, 1 h steps', new Date(2026, 2, 8, 0).getTime(), new Date(2026, 2, 8, 5).getTime()],
      ['fall back, 30 min steps', new Date(2026, 10, 1, 0).getTime(), new Date(2026, 10, 1, 3).getTime()],
      ['fall back, days', new Date(2026, 9, 30).getTime(), new Date(2026, 10, 3).getTime()]
    ];
    for (const [name, min, max] of dstRanges) {
      it(`keeps ticks strictly increasing across a DST change (${name})`, () => {
        const ticks = buildTimeTicks(min, max);

        expect(ticks.length).toBeGreaterThan(1);
        expect(ticks.filter((t, i) => i > 0 && t <= ticks[i - 1])).toEqual([]);
      });
    }

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
      expect(annotations.every((a) => a.xMin === a.xMax)).toBe(true);
    });

    it('labels each day at the top of the plot, clear of the data and the x ticks', () => {
      const start = new Date(2026, 0, 1, 12).getTime();
      const [annotation] = buildDayBoundaryAnnotations({ minX: start, maxX: start + DAY_MS });

      expect(annotation.label!.position).toBe('end');
    });

    for (const [name, minX, maxX] of [
      ['spring forward', new Date(2026, 2, 6, 12).getTime(), new Date(2026, 2, 10, 12).getTime()],
      ['fall back', new Date(2026, 9, 30, 12).getTime(), new Date(2026, 10, 3, 12).getTime()]
    ] as const) {
      it(`keeps each line on its own local midnight across a DST change (${name})`, () => {
        const annotations = buildDayBoundaryAnnotations({ minX, maxX });

        expect(annotations.length).toBe(4);
        expect(annotations.map((a) => new Date(a.xMin as number).getHours())).toEqual([0, 0, 0, 0]);
        expect(new Set(annotations.map((a) => a.label!.content)).size).toBe(4);
      });
    }

    it('draws nothing inside a single day', () => {
      const start = new Date(2026, 0, 1, 1).getTime();

      expect(buildDayBoundaryAnnotations({ minX: start, maxX: start + 60 * 60 * 1000 })).toEqual([]);
    });
  });

  describe('nearestIndex', () => {
    const points = [{ x: 10 }, { x: 20 }, { x: 30 }];

    it('finds an exact match', () => {
      expect(nearestIndex(points, 20)).toBe(1);
    });

    it('picks the closer neighbour between two samples, the earlier one on a tie', () => {
      expect(nearestIndex(points, 24)).toBe(1);
      expect(nearestIndex(points, 26)).toBe(2);
      expect(nearestIndex(points, 25)).toBe(1);
    });

    it('clamps to the first or last sample outside the data', () => {
      expect(nearestIndex(points, -5)).toBe(0);
      expect(nearestIndex(points, 99)).toBe(2);
    });

    it('is -1 for an empty series', () => {
      expect(nearestIndex([], 5)).toBe(-1);
    });
  });

  describe('lineValueAt', () => {
    const points = [
      { x: 10, y: 0 },
      { x: 20, y: 10 },
      { x: 30, y: 4 }
    ];

    it('is a sample at its own time', () => {
      expect(lineValueAt(points, 20)).toEqual({ x: 20, y: 10 });
    });

    it('is on the straight line between the samples either side, as the line is drawn', () => {
      expect(lineValueAt(points, 12.5)).toEqual({ x: 12.5, y: 2.5 });
      expect(lineValueAt(points, 25)).toEqual({ x: 25, y: 7 });
    });

    it('snaps to the end sample just past either end, and is null further out', () => {
      expect(lineValueAt(points, 8, 2)).toEqual({ x: 10, y: 0 });
      expect(lineValueAt(points, 33, 2)).toBeNull();
      expect(lineValueAt(points, 31, 2)).toEqual({ x: 30, y: 4 });
      expect(lineValueAt(points, 5, 2)).toBeNull();
    });

    it('is null for an empty series', () => {
      expect(lineValueAt([], 5)).toBeNull();
    });
  });

  describe('nearestPerSeries', () => {
    // Two series on unaligned timestamps; the x scale maps pixel p to time 10 * p across a 40 px plot
    const series = [
      [
        { x: 100, y: 1 },
        { x: 200, y: 2 },
        { x: 300, y: 3 }
      ],
      [
        { x: 150, y: 4 },
        { x: 260, y: 5 }
      ]
    ];
    const fakeChart = (visible = [0, 1]) =>
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
          visible.map((index) => ({ index, data: series[index].map((point) => ({ point })) }))
      }) as never;
    const at = (x: number, y = 20) => ({ native: null, type: 'mousemove', x, y }) as never;

    it("takes each visible series with data at the cursor's time, with its nearest sample's element", () => {
      const items = nearestPerSeries(fakeChart(), at(25), {} as never);

      expect(items.map(({ datasetIndex, index }) => [datasetIndex, index])).toEqual([
        [0, 1],
        [1, 1]
      ]);
      expect(items[0].element).toEqual({ point: series[0][1] } as never);
    });

    it(`leaves out a series with no data within ${HOVER_SNAP_PX} px of the cursor's time`, () => {
      // Time 50: series 0 starts 5 px later, series 1 10 px later
      expect(nearestPerSeries(fakeChart(), at(5), {} as never).map((item) => item.datasetIndex)).toEqual([0]);
    });

    it('skips series hidden from the legend', () => {
      expect(nearestPerSeries(fakeChart([1]), at(25), {} as never).map((item) => item.datasetIndex)).toEqual([1]);
    });

    it('hovers nothing outside the plot area', () => {
      expect(nearestPerSeries(fakeChart(), at(25, 60), {} as never)).toEqual([]);
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

      expect(csv).toBe(`time,V 0,I 0\r\n${iso(1000)},400,20\r\n`);
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

    it('quotes a series name holding a comma or a quote', () => {
      expect(buildCsv(new Map([['a,"b"', []]]))).toBe('time,"a,""b"""\r\n');
    });
  });

  describe('placeTooltip', () => {
    const area = { left: 0, top: 0, right: 400, bottom: 300 };

    it('sits below-right of the cursor when it fits', () => {
      expect(placeTooltip({ x: 100, y: 100 }, { width: 50, height: 20 }, area)).toEqual({
        x: 112,
        y: 112,
        xAlign: 'left',
        yAlign: 'top'
      });
    });

    it("flips to the cursor's other side near the right and bottom edges", () => {
      expect(placeTooltip({ x: 380, y: 290 }, { width: 50, height: 20 }, area)).toEqual({
        x: 368,
        y: 278,
        xAlign: 'right',
        yAlign: 'bottom'
      });
    });
  });
});

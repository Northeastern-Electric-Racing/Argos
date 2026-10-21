import {
  baseGraphChartOption,
  buildDayBoundaryMarkLine,
  buildMultiYAxes,
  DAY_BOUNDARIES_ID,
  DAY_MS,
  graphChartUpdate,
  GraphChartState,
  multiDayLabel,
  Point,
  singleDayLabel,
  tooltipFormatter
} from './graph-chart-options';

type AnyRecord = Record<string, unknown>;

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function state(overrides: Partial<GraphChartState> = {}): GraphChartState {
  return {
    data: new Map<string, Point[]>(),
    multipleYAxes: false,
    yMin: null,
    yMax: null,
    xRangeMs: undefined,
    detectMultiDay: false,
    chartWidth: 1000,
    ...overrides
  };
}

describe('graph chart options', () => {
  describe('baseGraphChartOption', () => {
    it("draws every series in a colour that stands out (3:1, WCAG 1.4.11) on the page's #101010", () => {
      const colors = baseGraphChartOption()['color'] as string[];

      expect(colors.length).toBeGreaterThan(0);
      colors.forEach((c) => expect(contrast(c, '#101010')).withContext(c).toBeGreaterThanOrEqual(3));
    });

    it("uses the app's Roboto for chart text and the tooltip", () => {
      const option = baseGraphChartOption() as AnyRecord;

      expect((option['textStyle'] as AnyRecord)['fontFamily']).toContain('Roboto');
      const tooltip = option['tooltip'] as AnyRecord;
      expect((tooltip['textStyle'] as AnyRecord)['fontFamily']).toContain('Roboto');
    });
  });

  describe('buildMultiYAxes', () => {
    it('builds one y-axis per topic, named without the value index', () => {
      const axes = buildMultiYAxes(['BMS/Pack/Voltage 0', 'BMS/Pack/Current 0']) as AnyRecord[];

      expect(axes.length).toBe(2);
      expect(axes[0]['name']).toBe('BMS/Pack/Voltage ');
    });

    it('alternates sides and steps stacked axes outward so they stay readable', () => {
      const axes = buildMultiYAxes(['A 0', 'B 0', 'C 0', 'D 0']) as AnyRecord[];

      expect(axes.map((a) => a['position'])).toEqual(['left', 'right', 'left', 'right']);
      expect(axes.map((a) => a['offset'])).toEqual([0, 0, 80, 80]);
    });

    it("lines every axis's ticks up with the first axis's grid lines", () => {
      const axes = buildMultiYAxes(['A 0', 'B 0', 'C 0']) as AnyRecord[];

      expect(axes.map((a) => a['alignTicks'])).toEqual([false, true, true]);
    });
  });

  describe('graphChartUpdate', () => {
    const data = new Map<string, Point[]>([
      ['A 0', [[1000, 1]]],
      ['B 0', [[2000, 2]]]
    ]);

    it('gives each series a stable id so updates merge into the existing series', () => {
      const series = graphChartUpdate(state({ data })).series as AnyRecord[];

      expect(series.map((s) => s['id'])).toEqual(['A 0', 'B 0']);
      expect(series[0]['data']).toBe(data.get('A 0'));
    });

    it('puts every series on the one shared axis, with the configured bounds, by default', () => {
      const update = graphChartUpdate(state({ data, yMin: -5, yMax: 10 }));

      expect((update.series as AnyRecord[]).map((s) => s['yAxisIndex'])).toEqual([0, 0]);
      const yAxis = update.yAxis as AnyRecord[];
      expect(yAxis.length).toBe(1);
      expect(yAxis[0]['min']).toBe(-5);
      expect(yAxis[0]['max']).toBe(10);
    });

    it('gives each y-axis a stable id, so a redraw merges into the existing axes instead of rebuilding them', () => {
      const ids = (update: ReturnType<typeof graphChartUpdate>) => (update.yAxis as AnyRecord[]).map((a) => a['id']);

      expect(ids(graphChartUpdate(state({ data })))).toEqual(ids(graphChartUpdate(state({ data }))));
      expect(ids(graphChartUpdate(state({ data, multipleYAxes: true })))).toEqual(['A 0', 'B 0']);
    });

    it('gives each series its own axis with multiple y-axes on (#630)', () => {
      const update = graphChartUpdate(state({ data, multipleYAxes: true }));

      expect((update.series as AnyRecord[]).map((s) => s['yAxisIndex'])).toEqual([0, 1]);
      expect((update.yAxis as AnyRecord[]).length).toBe(2);
    });

    it('keeps one y-axis with multiple y-axes on but no data, so ECharts can still lay out the grid', () => {
      const update = graphChartUpdate(state({ multipleYAxes: true }));

      expect((update.yAxis as AnyRecord[]).length).toBe(1);
    });

    it('shows a live window ending at the newest point', () => {
      const update = graphChartUpdate(state({ data, xRangeMs: 500 }));

      expect((update.xAxis as AnyRecord)['min']).toBe(1500);
    });

    it("cuts each series to a live window, starting it with a point on the window's left edge", () => {
      const points: Point[] = [
        [0, 1000],
        [1000, 1],
        [3000, 3],
        [5000, 5]
      ];

      const update = graphChartUpdate(state({ data: new Map([['A 0', points]]), xRangeMs: 3000 }));

      // The point at 0 s is gone, and the line from 1 s to 3 s is cut at the edge, 2 s
      expect((update.series as AnyRecord[])[0]['data']).toEqual([
        [2000, 2],
        [3000, 3],
        [5000, 5]
      ]);
    });

    it('places the ticks of views under an hour in UTC, which ECharts can tick through the hour repeated at DST end', () => {
      // ECharts' local-time ticks skip a view inside or across that hour, leaving only its two ends
      const hours = (h: number) => h * 60 * 60 * 1000;
      const long = new Map<string, Point[]>([
        [
          'A 0',
          [
            [0, 1],
            [hours(2), 2]
          ]
        ]
      ]);

      expect(graphChartUpdate(state({ data: long, xRangeMs: 30_000 }))['useUTC']).toBeTrue();
      expect(graphChartUpdate(state({ data }))['useUTC']).toBeTrue();
      // Hour and day ticks stay on local hours and midnights
      expect(graphChartUpdate(state({ data: long }))['useUTC']).toBeFalse();
      expect(graphChartUpdate(state({ data: long, xRangeMs: hours(1.5) }))['useUTC']).toBeFalse();
      expect(graphChartUpdate(state())['useUTC']).toBeFalse();
    });

    it('labels a live window as sparsely as a paused or historical one (about 6 labels)', () => {
      // With a fixed min, ECharts' time scale puts about twice splitNumber labels on the axis
      expect((graphChartUpdate(state({ data, xRangeMs: 500 })).xAxis as AnyRecord)['splitNumber']).toBe(3);
      expect((graphChartUpdate(state({ data })).xAxis as AnyRecord)['splitNumber']).toBe(6);
    });

    it('bounds the legend by the chart width so its pager stops short of the toolbox', () => {
      // ECharts drops a legend's `right` when `left` is set, so only a width bounds it
      expect((baseGraphChartOption().legend as AnyRecord)['right']).toBeUndefined();
      const legend = graphChartUpdate(state({ data, chartWidth: 1000 })).legend as AnyRecord;
      const base = baseGraphChartOption();
      const baseLegend = base.legend as AnyRecord;
      const toolbox = base.toolbox as AnyRecord;
      const toolboxLeft =
        1000 - (toolbox['right'] as number) - 4 * (toolbox['itemSize'] as number) - 3 * (toolbox['itemGap'] as number);
      const legendRight =
        (baseLegend['left'] as number) + 2 * (baseLegend['padding'] as number) + (legend['width'] as number);

      expect(legendRight).toBeLessThan(toolboxLeft);
      expect(legendRight).toBeGreaterThan(toolboxLeft - 48);
    });

    it('clears the window so the axis fits all data when there is no range', () => {
      const update = graphChartUpdate(state({ data }));

      expect((update.xAxis as AnyRecord)['min']).toBeNull();
    });

    it('marks each local midnight on a multi-day historical range', () => {
      const start = new Date(2026, 0, 1, 12).getTime();
      const multiDay = new Map<string, Point[]>([
        [
          'A 0',
          [
            [start, 1],
            [start + 2 * DAY_MS, 2]
          ]
        ]
      ]);

      const update = graphChartUpdate(state({ data: multiDay, detectMultiDay: true }));

      // On a series of their own, so hiding a topic in the legend can't take them with it
      const series = update.series as AnyRecord[];
      const boundaries = series.find((s) => s['id'] === DAY_BOUNDARIES_ID)!;
      expect(boundaries['data']).toEqual([]);
      expect(boundaries['name']).toBeUndefined();
      expect(series.find((s) => s['id'] === 'A 0')!['markLine']).toBeUndefined();
      const markLine = boundaries['markLine'] as { data: { xAxis: number }[] };
      expect(markLine.data.map((d) => d.xAxis)).toEqual([new Date(2026, 0, 2).getTime(), new Date(2026, 0, 3).getTime()]);
      const axisLabel = (update.xAxis as AnyRecord)['axisLabel'] as AnyRecord;
      expect(axisLabel['formatter']).toBe(multiDayLabel);
    });

    it('marks each local midnight across a daylight-saving change, once per date', () => {
      // Only fails in a zone with DST, such as Boston's (clocks change on 2026-11-01 and 2026-03-08); in UTC every
      // day is 24 h
      const ranges: [from: Date, to: Date, midnights: Date[]][] = [
        [
          new Date(2026, 9, 30, 12),
          new Date(2026, 10, 3, 12),
          [new Date(2026, 9, 31), new Date(2026, 10, 1), new Date(2026, 10, 2), new Date(2026, 10, 3)]
        ],
        [
          new Date(2026, 2, 7, 12),
          new Date(2026, 2, 10, 12),
          [new Date(2026, 2, 8), new Date(2026, 2, 9), new Date(2026, 2, 10)]
        ]
      ];
      for (const [from, to, midnights] of ranges) {
        const { data: lines } = buildDayBoundaryMarkLine({ minX: from.getTime(), maxX: to.getTime() }) as {
          data: { xAxis: number; label: { formatter: string } }[];
        };

        expect(lines.map((l) => l.xAxis)).toEqual(midnights.map((d) => d.getTime()));
        expect(new Set(lines.map((l) => l.label.formatter)).size).toBe(midnights.length);
      }
    });

    it('skips day boundaries in live mode', () => {
      const multiDay = new Map<string, Point[]>([
        [
          'A 0',
          [
            [0, 1],
            [2 * DAY_MS, 2]
          ]
        ]
      ]);

      const update = graphChartUpdate(state({ data: multiDay, detectMultiDay: false }));

      // Left out, so replaceMerge removes the boundaries of an earlier multi-day range
      expect((update.series as AnyRecord[]).map((s) => s['id'])).toEqual(['A 0']);
      expect(((update.xAxis as AnyRecord)['axisLabel'] as AnyRecord)['formatter']).toBe(singleDayLabel);
    });
  });

  describe('tooltipFormatter', () => {
    it('lists each series value under the hovered time, escaping topic names', () => {
      const html = tooltipFormatter([
        { marker: '', seriesName: 'A<b> 0', value: [1000, 1.5] },
        { marker: '', seriesName: 'B 0', value: [1000, 2] }
      ]);

      expect(html).toContain('A&#60;b&#62; 0: <b>1.5</b>');
      expect(html).toContain('B 0: <b>2</b>');
    });
  });
});

import {
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

function state(overrides: Partial<GraphChartState> = {}): GraphChartState {
  return {
    data: new Map<string, Point[]>(),
    multipleYAxes: false,
    yMin: null,
    yMax: null,
    xRangeMs: undefined,
    detectMultiDay: false,
    ...overrides
  };
}

describe('graph chart options', () => {
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

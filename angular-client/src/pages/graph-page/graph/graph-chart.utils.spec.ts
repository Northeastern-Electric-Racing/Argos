import uPlot from 'uplot';
import {
  alignSeries,
  buildGraphChartOptions,
  buildYAxes,
  dataSpan,
  DAY_MS,
  dayBoundaries,
  growingAxisSize,
  placeTooltip,
  showGridOnFirstVisibleAxis,
  yRange
} from './graph-chart.utils';

describe('graph chart utils', () => {
  describe('alignSeries', () => {
    it('merges series onto one sorted x array, leaving undefined where a series has no point', () => {
      const aligned = alignSeries([
        { xs: [1, 3], ys: [10, 30] },
        { xs: [2, 3], ys: [200, 300] }
      ]);

      expect(aligned).toEqual([
        [1, 2, 3],
        [10, undefined, 30],
        [undefined, 200, 300]
      ]);
    });

    it('keeps duplicate timestamps within a series', () => {
      const aligned = alignSeries([
        { xs: [1, 1], ys: [1, 2] },
        { xs: [1], ys: [5] }
      ]);

      expect(aligned).toEqual([
        [1, 1],
        [1, 2],
        [5, undefined]
      ]);
    });

    it('hands a single series to uPlot as is, without copying it', () => {
      const series = { xs: [1, 2], ys: [10, 20] };
      const [xs, ys] = alignSeries([series]);

      expect(xs).toBe(series.xs);
      expect(ys).toBe(series.ys);
    });

    it('returns just an empty x array with no series', () => {
      expect(alignSeries([])).toEqual([[]]);
    });
  });

  it('dataSpan reads the extent from each sorted series and is null with no points', () => {
    expect(
      dataSpan([
        { xs: [5, 9], ys: [0, 0] },
        { xs: [2], ys: [0] },
        { xs: [], ys: [] }
      ])
    ).toEqual({ minX: 2, maxX: 9, spanMs: 7 });
    expect(dataSpan([{ xs: [], ys: [] }])).toBeNull();
  });

  it('dayBoundaries lists each local midnight strictly inside the range', () => {
    const start = new Date(2026, 0, 1, 12).getTime();
    const boundaries = dayBoundaries(start, start + 2 * DAY_MS);

    expect(boundaries).toEqual([new Date(2026, 0, 2).getTime(), new Date(2026, 0, 3).getTime()]);
    expect(dayBoundaries(start, start + 60_000)).toEqual([]);
  });

  it('yRange lets fixed bounds override either side of the auto range', () => {
    const [autoMin, autoMax] = yRange(0, 10, null, null);
    expect(autoMin).toBeLessThanOrEqual(0);
    expect(autoMax).toBeGreaterThanOrEqual(10);

    expect(yRange(0, 10, -5, null)[0]).toBe(-5);
    expect(yRange(0, 10, null, 50)[1]).toBe(50);
    expect(yRange(null, null, null, null)).toEqual([0, 1]);
  });

  it('yRange keeps the auto side past a fixed bound that lies outside the data', () => {
    const [autoMin, autoMax] = yRange(60, 105, null, null) as [number, number];
    const autoSpan = autoMax - autoMin;

    expect(yRange(60, 105, 120, null)).toEqual([120, 120 + autoSpan]);
    expect(yRange(60, 105, null, 40)).toEqual([40 - autoSpan, 40]);
  });

  // Regression coverage for #630: with "Multiple Y-Axes" on, the y-axis set must always
  // match the currently selected topics, so deselecting a topic prunes its axis.
  describe('buildYAxes (#630)', () => {
    it('builds one y-axis per topic', () => {
      expect(buildYAxes(['BMS/Pack/Voltage 0', 'BMS/Pack/Current 0'], true).length).toBe(2);
    });

    it('prunes a y-axis when its topic is deselected', () => {
      const axes = buildYAxes(['BMS/Pack/Voltage 0'], true);

      expect(axes.length).toBe(1);
      expect(axes[0].label).toBe('BMS/Pack/Voltage');
      expect(axes[0].scale).toBe('y0');
    });

    it('titles an axis with its topic, dropping only the trailing series index', () => {
      expect(buildYAxes(['BMS/Segment_Total_Volt/0 0', 'A 10'], true).map((axis) => axis.label)).toEqual([
        'BMS/Segment_Total_Volt/0',
        'A 10'
      ]);
    });

    it('alternates y-axis sides so stacked axes stay readable', () => {
      const sides = buildYAxes(['A 0', 'B 0', 'C 0'], true).map((axis) => axis.side);
      expect(sides).toEqual([3, 1, 3]);
    });

    it('shares one y-axis across topics when multiple axes are off', () => {
      const axes = buildYAxes(['A 0', 'B 0'], false);
      expect(axes.length).toBe(1);
      expect(axes[0].scale).toBe('y');
    });
  });

  describe('buildGraphChartOptions', () => {
    const config = { yBounds: () => ({ yMin: null, yMax: null }), isMultiDay: () => false };

    it('puts every topic on the shared y scale by default', () => {
      const options = buildGraphChartOptions({ ...config, keys: ['A 0', 'B 0'], multipleYAxes: false });

      expect(options.series.map((s) => s.scale)).toEqual([undefined, 'y', 'y']);
      expect(Object.keys(options.scales!)).toEqual(['x', 'y']);
      expect(options.axes!.length).toBe(2);
    });

    it('gives each topic its own y scale and axis with multiple axes on', () => {
      const options = buildGraphChartOptions({ ...config, keys: ['A 0', 'B 0'], multipleYAxes: true });

      expect(options.series.map((s) => s.scale)).toEqual([undefined, 'y0', 'y1']);
      expect(Object.keys(options.scales!)).toEqual(['x', 'y0', 'y1']);
      expect(options.axes!.length).toBe(3);
    });

    it('reads the Y Min/Max bounds when uPlot ranges a scale, so new bounds need no rebuild', () => {
      let bounds: { yMin: number | null; yMax: number | null } = { yMin: null, yMax: null };
      const options = buildGraphChartOptions({ ...config, keys: ['A 0'], multipleYAxes: false, yBounds: () => bounds });
      const range = options.scales!['y'].range as uPlot.Range.Function;

      bounds = { yMin: -10, yMax: 10 };
      expect(range({} as uPlot, 0, 5, 'y')).toEqual([-10, 10]);
    });

    it('formats x labels by the visible span, so a zoomed multi-day run shows times, not repeated dates', () => {
      const options = buildGraphChartOptions({ ...config, keys: [], multipleYAxes: false });
      const values = options.axes![0].values as (u: unknown, splits: number[]) => string[];
      const visible = (spanMs: number) => ({ scales: { x: { min: 0, max: spanMs } } });
      const t = new Date(2026, 0, 2, 13, 5).getTime();

      expect(values(visible(DAY_MS / 2), [t])[0]).toBe('13:05:00');
      expect(values(visible(DAY_MS / 2), [new Date(2026, 0, 2, 0, 7, 9).getTime()])[0]).toBe('00:07:09');
      expect(values(visible(2 * DAY_MS), [t])[0]).toBe('1/2 13:05');
    });

    it('steps x ticks by whole seconds, with a 2-minute step for 10-20 minute spans', () => {
      const incrs = buildGraphChartOptions({ ...config, keys: [], multipleYAxes: false }).axes![0].incrs as number[];

      expect(incrs[0]).toBe(1000);
      expect(incrs).toContain(2 * 60_000);
    });

    it('leaves a scale unranged while none of its series is shown, so uPlot hides its axis', () => {
      const options = buildGraphChartOptions({ ...config, keys: ['A 0', 'B 0'], multipleYAxes: true });
      const range = options.scales!['y0'].range as uPlot.Range.Function;
      const u = { series: [{}, { scale: 'y0', show: false }, { scale: 'y1', show: true }] } as unknown as uPlot;

      expect(range(u, 0, 5, 'y0')).toEqual([null, null]);
      u.series[1].show = true;
      expect(range(u, 0, 5, 'y0')).not.toEqual([null, null]);
    });

    it('fills legend markers with the series color', () => {
      const options = buildGraphChartOptions({ ...config, keys: ['A 0'], multipleYAxes: false });
      const fill = options.legend!.markers!.fill as (u: uPlot, i: number) => string;

      expect(fill({} as uPlot, 1)).toBe('#008FFB');
    });
  });

  describe('growingAxisSize', () => {
    const fakeChart = () => ({ axes: [{}, { font: ['12px sans-serif'], ticks: { size: 10 }, gap: 5 }] }) as unknown as uPlot;

    it('widens a y-axis to fit its widest label, in 10 px steps', () => {
      const size = growingAxisSize();
      const u = fakeChart();

      expect(size(u, ['1', '2'], 1, 1)).toBe(50);
      const wide = size(u, ['43,267.5'], 1, 1);
      expect(wide).toBeGreaterThan(50);
      expect(wide % 10).toBe(0);
    });

    it('never shrinks within a chart, so live labels changing width do not shift the plot', () => {
      const size = growingAxisSize();
      const u = fakeChart();
      const wide = size(u, ['43,267.5'], 1, 1);

      expect(size(u, ['1'], 1, 2)).toBe(wide);
      expect(size(u, null as unknown as string[], 1, 0)).toBe(wide);
    });
  });

  describe('showGridOnFirstVisibleAxis', () => {
    it('moves the grid to the first axis whose series is shown', () => {
      const u = {
        series: [{}, { show: false }, { show: true }, { show: true }],
        axes: [{}, { grid: { show: true } }, { grid: { show: false } }, { grid: { show: false } }]
      } as unknown as uPlot;

      showGridOnFirstVisibleAxis(u);

      expect(u.axes.slice(1).map((axis) => axis.grid!.show)).toEqual([false, true, false]);
    });
  });

  describe('placeTooltip', () => {
    it('sits below-right of the cursor when it fits', () => {
      expect(placeTooltip(100, 100, 50, 20, 400, 300)).toEqual({ x: 112, y: 112 });
    });

    it("flips to the cursor's other side near the right and bottom edges", () => {
      expect(placeTooltip(380, 290, 50, 20, 400, 300)).toEqual({ x: 318, y: 258 });
    });

    it('stays inside the plot when it fits on neither side of the cursor', () => {
      expect(placeTooltip(150, 10, 240, 20, 340, 300)).toEqual({ x: 0, y: 22 });
      expect(placeTooltip(10, 290, 30, 400, 340, 300)).toEqual({ x: 22, y: 0 });
    });
  });
});

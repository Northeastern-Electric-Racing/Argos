import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AutoscaleInfo,
  ISeriesApi,
  LineSeriesOptions,
  MouseEventParams,
  SeriesType,
  TickMarkType,
  Time,
  TimeScaleOptions
} from 'lightweight-charts';
import { BehaviorSubject } from 'rxjs';
import { GraphData, ObservableGraphInfo } from 'src/utils/types.utils';
import CustomGraphComponent, { GraphConfig } from './graph.component';
import { fromChartTime, toChartTime } from './graph-chart.utils';
import { DayBoundariesPrimitive } from './day-boundaries.primitive';
import { HoverMarkersPrimitive } from './hover-markers.primitive';

const T0 = new Date(2026, 2, 14, 9, 0, 0).getTime();

const config = (overrides: Partial<GraphConfig> = {}): GraphConfig => ({
  maxPoints: 100,
  yMin: null,
  yMax: null,
  rangeMode: 'time',
  timeRangeMs: 30_000,
  ...overrides
});

/** The component's private series map, for checks on topic series only. */
interface Internals {
  series: Map<string, ISeriesApi<'Line'>>;
}

const topic = (label: string, points: GraphData[][] = []): ObservableGraphInfo => ({
  label,
  updates: new BehaviorSubject<GraphData[][]>(points)
});

/** Inline style colors read back as rgb(). */
const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`;
};

describe('CustomGraphComponent (lightweight-charts)', () => {
  let fixture: ComponentFixture<CustomGraphComponent>;
  let component: CustomGraphComponent;

  async function render(inputs: {
    topics: ObservableGraphInfo[];
    realTime?: boolean;
    multi?: boolean;
    graphConfig?: GraphConfig;
  }) {
    fixture = TestBed.createComponent(CustomGraphComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.display = 'flex';
    fixture.nativeElement.style.width = '800px';
    fixture.nativeElement.style.height = '400px';
    document.body.appendChild(fixture.nativeElement);
    fixture.componentRef.setInput('valuesSubject', inputs.topics);
    fixture.componentRef.setInput('graphConfig', inputs.graphConfig ?? config());
    fixture.componentRef.setInput('realTime', inputs.realTime ?? false);
    fixture.componentRef.setInput('limitRange', inputs.realTime ?? false);
    fixture.componentRef.setInput('showMultipleYAxes', inputs.multi ?? false);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  /** The hidden whitespace series that spaces the time scale by time. */
  const grid = () => (component as unknown as { grid: ISeriesApi<'Line'> }).grid;
  /** Topic series, leaving out the grid. */
  const allSeries = (): ISeriesApi<SeriesType, Time>[] =>
    component
      .chart!.panes()[0]
      .getSeries()
      .filter((s) => s !== grid());
  const times = (s: ISeriesApi<SeriesType, Time>) => s.data().map((d) => d.time);

  afterEach(() => {
    fixture?.destroy();
    fixture?.nativeElement.remove();
  });

  it('draws one series per topic value, with a legend entry for each', async () => {
    await render({
      topics: [
        topic('BMS/Pack/Voltage', [[{ x: T0, y: 400 }]]),
        topic('BMS/Cell/Temps', [[{ x: T0, y: 30 }], [{ x: T0, y: 31 }]])
      ]
    });

    expect(allSeries().length).toBe(3);
    expect(component.legend().map((l) => l.label)).toEqual(['BMS/Pack/Voltage 0', 'BMS/Cell/Temps 0', 'BMS/Cell/Temps 1']);
    expect(new Set(component.legend().map((l) => l.color)).size).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('.legend-item').length).toBe(3);
  });

  it('appends in-order live points without resetting the series data', async () => {
    const speed = topic('VCU/CarState/speed', [[{ x: T0, y: 1 }]]);
    await render({ topics: [speed], realTime: true });
    const [series] = allSeries();
    const setData = spyOn(series, 'setData').and.callThrough();
    const update = spyOn(series, 'update').and.callThrough();

    speed.updates.next([[{ x: T0 + 100, y: 2 }]]);
    speed.updates.next([[{ x: T0 + 250, y: 3 }]]);

    expect(setData).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(2);
    expect(times(series)).toEqual([T0, T0 + 100, T0 + 250].map(toChartTime));
  });

  it('keeps sub-second points distinct and in order, even when one arrives late', async () => {
    const speed = topic('VCU/CarState/speed', [[{ x: T0, y: 1 }]]);
    await render({ topics: [speed], realTime: true });

    speed.updates.next([[{ x: T0 + 200, y: 3 }]]);
    speed.updates.next([[{ x: T0 + 100, y: 2 }]]);

    const [series] = allSeries();
    expect(times(series)).toEqual([T0, T0 + 100, T0 + 200].map(toChartTime));
    expect(series.data().map((d) => (d as { value: number }).value)).toEqual([1, 2, 3]);
  });

  it('shows the configured live window ending at the latest point', async () => {
    const speed = topic('VCU/CarState/speed', [[{ x: T0, y: 1 }]]);
    await render({ topics: [speed], realTime: true, graphConfig: config({ timeRangeMs: 1000 }) });
    const setVisibleRange = spyOn(component.chart!.timeScale(), 'setVisibleRange').and.callThrough();

    speed.updates.next([[{ x: T0 + 5000, y: 2 }]]);

    expect(setVisibleRange).toHaveBeenCalledWith({ from: toChartTime(T0 + 4000), to: toChartTime(T0 + 5000) });
  });

  it('trims the live window in occasional batches rather than resetting the series on every point', async () => {
    const speed = topic('VCU/CarState/speed', [[{ x: T0, y: 0 }]]);
    await render({ topics: [speed], realTime: true, graphConfig: config({ rangeMode: 'points', maxPoints: 10 }) });
    const [series] = allSeries();
    const setData = spyOn(series, 'setData').and.callThrough();

    for (let i = 1; i <= 200; i++) {
      speed.updates.next([[{ x: T0 + i * 10, y: i }]]);
    }

    expect(component.data.get('VCU/CarState/speed 0')!.length).toBe(11);
    expect(setData.calls.count()).toBeGreaterThan(0);
    expect(setData.calls.count()).toBeLessThan(10);
    expect(series.data().length).toBeLessThanOrEqual(11 + 51);
    expect(series.data().at(-1)!.time).toBe(toChartTime(T0 + 2000));
  });

  it('spaces the time axis by time, so a gap in the data keeps its width', async () => {
    // 10 s of data at 1 Hz, a 50 s gap, then 10 s more.
    const second = 1000;
    const points = [
      ...Array.from({ length: 11 }, (_, i) => ({ x: T0 + i * second, y: i })),
      ...Array.from({ length: 11 }, (_, i) => ({ x: T0 + (60 + i) * second, y: i }))
    ];
    await render({ topics: [topic('A', [points])] });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    component.resetZoom();

    const x = (ms: number) => component.chart!.timeScale().timeToCoordinate(toChartTime(ms))!;
    const data = x(T0 + 10 * second) - x(T0);
    const gap = x(T0 + 60 * second) - x(T0 + 10 * second);
    expect(gap / data).toBeCloseTo(5, 0);
  });

  it('keeps the live whitespace grid bounded, rebuilding it only every few seconds', async () => {
    const speed = topic('VCU/CarState/speed', [[{ x: T0, y: 0 }]]);
    await render({ topics: [speed], realTime: true, graphConfig: config({ timeRangeMs: 30_000 }) });
    // series.data() leaves whitespace out, so record what the grid is handed instead.
    const setData = spyOn(grid(), 'setData').and.callThrough();

    // A minute of 10 Hz data.
    for (let i = 1; i <= 600; i++) {
      speed.updates.next([[{ x: T0 + i * 100, y: i }]]);
    }

    // A 30 s window gets a 20 ms grid running 500 points (10 s) past the data: a rebuild every ~10 s.
    expect(setData.calls.count()).toBeGreaterThan(0);
    expect(setData.calls.count()).toBeLessThanOrEqual(8);
    const times = setData.calls.mostRecent().args[0].map((d) => fromChartTime(d.time));
    const latest = T0 + 60_000;
    expect(times[0]).toBeGreaterThanOrEqual(latest - 2 * 30_000);
    expect(times.at(-1)!).toBeGreaterThan(latest);
    expect(times.length).toBeLessThanOrEqual(2 * 1500 + 500 + 1);
  });

  it('labels day changes on the time axis with their date, and other ticks with the time', async () => {
    const day = 24 * 60 * 60 * 1000;
    await render({
      topics: [
        topic('A', [
          [
            { x: T0, y: 1 },
            { x: T0 + 2 * day, y: 2 }
          ]
        ])
      ]
    });

    const format = (component.chart!.options().timeScale as TimeScaleOptions).tickMarkFormatter!;
    const midnight = new Date(2026, 2, 15).getTime();
    expect(format(toChartTime(midnight), TickMarkType.DayOfMonth, 'en-US')).toBe('3/15');
    expect(format(toChartTime(T0), TickMarkType.DayOfMonth, 'en-US')).toBe('3/14 09:00');
    expect(format(toChartTime(T0), TickMarkType.Time, 'en-US')).toBe('09:00');
    // A day tick sits on local midnight: the grid has a bar there, in any time zone.
    expect(component.chart!.timeScale().timeToCoordinate(toChartTime(midnight))).not.toBeNull();
  });

  it('leaves raw data times off the time axis, keeping milliseconds for a deep zoom', async () => {
    // A minute at 1 Hz, every point 426 ms past the second.
    const points = Array.from({ length: 60 }, (_, i) => ({ x: T0 + 426 + i * 1000, y: i }));
    await render({ topics: [topic('A', [points])] });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    component.resetZoom();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const format = (component.chart!.options().timeScale as TimeScaleOptions).tickMarkFormatter!;
    // The library fills room near the edges with any bar, often a data point off the second.
    expect(format(toChartTime(T0 + 426), TickMarkType.TimeWithSeconds, 'en-US')).toBe('');
    expect(format(toChartTime(T0 + 5000), TickMarkType.TimeWithSeconds, 'en-US')).toBe('09:00:05');

    component.chart!.timeScale().setVisibleRange({ from: toChartTime(T0 + 10_000), to: toChartTime(T0 + 12_000) });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(format(toChartTime(T0 + 10_426), TickMarkType.TimeWithSeconds, 'en-US')).toBe('09:00:10.426');
  });

  it('draws each day boundary at local midnight', async () => {
    const hour = 60 * 60 * 1000;
    const points = Array.from({ length: 60 }, (_, i) => ({ x: T0 + i * hour + 7 * 60_000, y: i }));
    await render({ topics: [topic('A', [points])] });
    // The grid's ~2000 bars only fit once autoSize has measured the chart.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    component.resetZoom();

    const { dayBoundaries } = component as unknown as { dayBoundaries: DayBoundariesPrimitive };
    const timeScale = component.chart!.timeScale();
    const midnights = [new Date(2026, 2, 15).getTime(), new Date(2026, 2, 16).getTime()];
    const expected = midnights.map((ms) => timeScale.timeToCoordinate(toChartTime(ms))!);

    const xs = dayBoundaries.positions().map((p) => p.x);
    expect(xs.length).toBe(2);
    xs.forEach((x, i) => expect(x).toBeCloseTo(expected[i], 5));
    expect(xs[0]).toBeGreaterThan(0);
  });

  it('draws a day line on every midnight inside a data gap, a day apart', async () => {
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;
    const points = [T0, T0 + 3 * hour, T0 + 2 * day, T0 + 2 * day + 3 * hour].map((x, i) => ({ x, y: i }));
    await render({ topics: [topic('A', [points])] });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    component.resetZoom();

    const { dayBoundaries } = component as unknown as { dayBoundaries: DayBoundariesPrimitive };
    const x = (ms: number) => component.chart!.timeScale().timeToCoordinate(toChartTime(ms))!;
    const positions = dayBoundaries.positions();
    expect(positions.map((p) => p.label)).toEqual(['Sun, Mar 15', 'Mon, Mar 16']);
    expect((positions[1].x - positions[0].x) / (x(T0 + 2 * day) - x(T0))).toBeCloseTo(0.5, 2);
  });

  it('fits a whole long historical run, not just the bars the default minimum spacing allows', async () => {
    // 50 hours at one point every 30 s: 6001 bars, far more than an 800 px chart fits at 0.5 px each.
    const points = Array.from({ length: 6001 }, (_, i) => ({ x: T0 + i * 30_000, y: i % 100 }));
    await render({ topics: [topic('A', [points])] });
    // autoSize measures the container on the next frame; fit once the chart has its width.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    component.resetZoom();

    const range = component.chart!.timeScale().getVisibleRange()!;
    expect(range.from).toBe(toChartTime(T0));
    expect(range.to).toBe(toChartTime(points.at(-1)!.x));
  });

  it('zooms back out to the whole range on double-click', async () => {
    await render({ topics: [topic('A', [[{ x: T0, y: 1 }]])] });
    expect(component.chart!.options().handleScale).toEqual(
      jasmine.objectContaining({ axisDoubleClickReset: { time: false, price: true } })
    );
    const setVisibleRange = spyOn(component.chart!.timeScale(), 'setVisibleRange').and.callThrough();

    fixture.nativeElement.querySelector('.chart-container').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    // The data's own range, not fitContent(), which would include a live grid's look-ahead.
    expect(setVisibleRange).toHaveBeenCalledWith({
      from: toChartTime(T0),
      to: toChartTime(T0)
    });
  });

  it('ends the shared y-axis exactly at a configured min and max', async () => {
    await render({ topics: [topic('A', [[{ x: T0, y: 1 }]])], graphConfig: config({ yMin: 0, yMax: 100 }) });
    // A whisker of margin, so the limits' own labels are drawn whole.
    expect(component.chart!.priceScale('left').options().scaleMargins).toEqual({ top: 0.02, bottom: 0.02 });
    expect(component.chart!.priceScale('left').options().entireTextOnly).toBeTrue();

    fixture.componentRef.setInput('graphConfig', config({ yMin: 0, yMax: null }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.chart!.priceScale('left').options().scaleMargins).toEqual({ top: 0.2, bottom: 0.02 });

    fixture.componentRef.setInput('showMultipleYAxes', true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.chart!.priceScale('left').options().scaleMargins).toEqual({ top: 0.2, bottom: 0.1 });
  });

  it('drops a series and its axis when its topic is deselected (#630)', async () => {
    const voltage = topic('BMS/Pack/Voltage', [[{ x: T0, y: 400 }]]);
    const current = topic('BMS/Pack/Current', [[{ x: T0, y: 20 }]]);
    await render({ topics: [voltage, current], multi: true });
    expect(allSeries().map((s) => s.options().priceScaleId)).toEqual(['left', 'right']);
    expect(component.chart!.options().rightPriceScale.visible).toBeTrue();

    fixture.componentRef.setInput('valuesSubject', [voltage]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(allSeries().length).toBe(1);
    expect(component.legend().map((l) => l.label)).toEqual(['BMS/Pack/Voltage 0']);
    expect(component.chart!.options().rightPriceScale.visible).toBeFalse();
  });

  it('gives each topic its own price scale with multiple y-axes, colouring the two drawn axes by topic', async () => {
    await render({
      topics: [topic('A', [[{ x: T0, y: 1 }]]), topic('B', [[{ x: T0, y: 2 }]]), topic('C', [[{ x: T0, y: 3 }]])],
      multi: true
    });
    expect(allSeries().map((s) => s.options().priceScaleId)).toEqual(['left', 'right', 'overlay-2']);
    // No title badge in the plot: each axis' text takes its topic's colour instead.
    expect(allSeries().map((s) => s.options().title)).toEqual(['', '', '']);
    expect(component.chart!.priceScale('left').options().textColor).toBe(component.legend()[0].color);
    expect(component.chart!.priceScale('right').options().textColor).toBe(component.legend()[1].color);
    // C's scale has no axis, so no last-value label of its own beside A's or B's ticks.
    expect(allSeries().map((s) => s.options().lastValueVisible)).toEqual([true, true, false]);

    fixture.componentRef.setInput('showMultipleYAxes', false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(allSeries().map((s) => s.options().priceScaleId)).toEqual(['left', 'left', 'left']);
    expect(allSeries()[2].data().length).toBe(1);
    expect(component.chart!.priceScale('left').options().textColor).toBe('#fff');
  });

  it('pins the shared y-axis to the configured min and max', async () => {
    await render({ topics: [topic('A', [[{ x: T0, y: 1 }]])], graphConfig: config({ yMin: 0, yMax: 100 }) });
    const provider = allSeries()[0].options().autoscaleInfoProvider!;
    const original = (): AutoscaleInfo => ({ priceRange: { minValue: 3, maxValue: 7 } });

    expect(provider(original)?.priceRange).toEqual({ minValue: 0, maxValue: 100 });

    fixture.componentRef.setInput('graphConfig', config({ yMin: null, yMax: 50 }));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(provider(original)?.priceRange).toEqual({ minValue: 3, maxValue: 50 });
  });

  it('clears every series when the graph is cleared', async () => {
    await render({ topics: [topic('A', [[{ x: T0, y: 1 }]])] });
    expect(allSeries().length).toBe(1);

    fixture.componentRef.setInput('clearGraph', 1);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(allSeries().length).toBe(0);
    expect(component.legend()).toEqual([]);
  });

  it('ignores updates while paused', async () => {
    const speed = topic('VCU/CarState/speed', [[{ x: T0, y: 1 }]]);
    await render({ topics: [speed], realTime: true });
    fixture.componentRef.setInput('isPaused', true);
    fixture.detectChanges();
    await fixture.whenStable();

    speed.updates.next([[{ x: T0 + 100, y: 2 }]]);

    expect(allSeries()[0].data().length).toBe(1);
  });

  it('drops trimmed points still drawn off-screen when paused, so zooming out shows only the data', async () => {
    const speed = topic('VCU/CarState/speed', [[{ x: T0, y: 0 }]]);
    await render({ topics: [speed], realTime: true, graphConfig: config({ rangeMode: 'points', maxPoints: 10 }) });
    for (let i = 1; i <= 30; i++) {
      speed.updates.next([[{ x: T0 + i * 10, y: i }]]);
    }
    const [series] = allSeries();
    const line = component.data.get('VCU/CarState/speed 0')!;
    // Live, trimmed points stay in the chart's copy, left of the window, until enough pile up.
    expect(series.data().length).toBeGreaterThan(line.length);

    fixture.componentRef.setInput('isPaused', true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(times(series)).toEqual(line.map((p) => toChartTime(p.x)));
  });

  // The chart only reports crosshair moves for real pointer events (setCrosshairPosition is silent),
  // so hand the handler what the chart passes it when the pointer is at (x, y) over `timeMs`'s bar.
  async function hoverAt(timeMs: number | undefined, x = 100, y = 100) {
    const { onCrosshairMove } = component as unknown as { onCrosshairMove: (p: MouseEventParams<Time>) => void };
    const time = timeMs === undefined ? undefined : toChartTime(timeMs);
    const logical = time === undefined ? null : component.chart!.timeScale().timeToIndex(time, true);
    onCrosshairMove(
      (time === undefined
        ? { seriesData: new Map() }
        : {
            time,
            logical: logical ?? undefined,
            point: { x, y },
            seriesData: new Map()
          }) as unknown as MouseEventParams<Time>
    );
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const tooltip = (): HTMLElement | null => fixture.nativeElement.querySelector('.tooltip');
  const tooltipRows = () =>
    Array.from(tooltip()!.querySelectorAll('.tooltip-row')).map((el) => [
      el.querySelector('.tooltip-label')!.textContent!.trim(),
      el.querySelector('.tooltip-value')!.textContent!.trim()
    ]);

  it('shows a tooltip with the hovered time and each topic’s latest value at it', async () => {
    const a = topic('A', [
      [
        { x: T0, y: 1 },
        { x: T0 + 2000, y: 3 }
      ]
    ]);
    const b = topic('B', [[{ x: T0 + 1000, y: 20 }]]);
    const c = topic('C', [[{ x: T0 + 5000, y: 7 }]]);
    await render({ topics: [a, b, c] });

    await hoverAt(T0 + 1000);

    expect(tooltip()).not.toBeNull();
    expect(tooltip()!.querySelector('.tooltip-time')!.textContent!.trim()).toBe('3/14/26, 09:00:01');
    // C has no point at or before the hovered time, so it keeps its row (in legend order) with no value.
    expect(tooltipRows()).toEqual([
      ['A 0', '1'],
      ['B 0', '20'],
      ['C 0', '—']
    ]);
    const swatches = Array.from(tooltip()!.querySelectorAll('.tooltip-row .swatch')) as HTMLElement[];
    expect(swatches.map((s) => s.style.background)).toEqual(component.legend().map((l) => hexToRgb(l.color)));
    // The values live in the tooltip now, not the legend.
    expect(fixture.nativeElement.querySelectorAll('.legend-value').length).toBe(0);

    await hoverAt(undefined);
    expect(component.hover()).toBeNull();
    expect(tooltip()).toBeNull();
  });

  it('reports the value the line draws for a repeated timestamp, not the first one received', async () => {
    // The chart keeps only the latest value for a repeated time, so the tooltip must too.
    await render({
      topics: [
        topic('A', [
          [
            { x: T0, y: 1 },
            { x: T0, y: 5 },
            { x: T0 + 1000, y: 7 }
          ]
        ])
      ]
    });

    await hoverAt(T0);

    expect(tooltipRows()).toEqual([['A 0', '5']]);
    const { hoverMarkers } = component as unknown as { hoverMarkers: HoverMarkersPrimitive };
    expect(hoverMarkers.positions().map((p) => p.y)).toEqual([allSeries()[0].priceToCoordinate(5)!]);
  });

  it('marks each topic’s held point at the hovered time, in place of the exact-bar crosshair marker', async () => {
    const a = topic('A', [
      [
        { x: T0, y: 1 },
        { x: T0 + 2000, y: 3 }
      ]
    ]);
    const b = topic('B', [[{ x: T0 + 1000, y: 20 }]]);
    await render({ topics: [a, b], multi: true });
    // Fit once autoSize has measured the chart, so both points are in view and on their scales.
    await new Promise((resolve) => requestAnimationFrame(resolve));
    component.resetZoom();
    expect(allSeries().map((s) => (s.options() as LineSeriesOptions).crosshairMarkerVisible)).toEqual([false, false]);
    const { hoverMarkers } = component as unknown as { hoverMarkers: HoverMarkersPrimitive };
    const timeScale = component.chart!.timeScale();
    const [seriesA, seriesB] = allSeries();

    await hoverAt(T0 + 1000);

    expect(hoverMarkers.positions()).toEqual([
      {
        x: timeScale.timeToCoordinate(toChartTime(T0))!,
        y: seriesA.priceToCoordinate(1)!,
        color: component.legend()[0].color
      },
      {
        x: timeScale.timeToCoordinate(toChartTime(T0 + 1000))!,
        y: seriesB.priceToCoordinate(20)!,
        color: component.legend()[1].color
      }
    ]);

    await hoverAt(undefined);
    expect(hoverMarkers.positions()).toEqual([]);
  });

  it('places the tooltip beside the cursor, flipping to its other side near the right and bottom edges', async () => {
    await render({ topics: [topic('A', [[{ x: T0, y: 1 }]])] });
    const area = fixture.nativeElement.querySelector('.chart-area') as HTMLElement;
    await new Promise((resolve) => requestAnimationFrame(resolve)); // lays out the price axis
    // The chart reports the cursor relative to the pane, which starts right of the left price axis.
    const paneLeft = component.chart!.priceScale('left').width();
    expect(paneLeft).toBeGreaterThan(0);
    const box = () => {
      const t = tooltip()!.getBoundingClientRect();
      const a = area.getBoundingClientRect();
      return { left: t.left - a.left, top: t.top - a.top, right: t.right - a.left, bottom: t.bottom - a.top };
    };

    await hoverAt(T0, 100, 100);
    expect(box().left).toBeCloseTo(paneLeft + 100 + 12, 0);
    expect(box().top).toBeCloseTo(100 + 12, 0);

    const right = area.clientWidth - paneLeft - 5;
    await hoverAt(T0, right, area.clientHeight - 5);
    expect(box().right).toBeCloseTo(paneLeft + right - 12, 0);
    expect(box().bottom).toBeCloseTo(area.clientHeight - 5 - 12, 0);
  });

  it('keeps the tooltip off the time axis near the bottom of the chart', async () => {
    await render({ topics: [topic('A', [[{ x: T0, y: 1 }]])] });
    // Wholly on screen, so the flip is against the time axis, not the window's bottom.
    Object.assign(fixture.nativeElement.style, { position: 'fixed', top: '0', left: '0', height: '300px' });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const area = fixture.nativeElement.querySelector('.chart-area') as HTMLElement;
    expect(area.getBoundingClientRect().bottom).toBeLessThanOrEqual(window.innerHeight);
    const axis = component.chart!.timeScale().height();
    expect(axis).toBeGreaterThan(0);

    await hoverAt(T0, 100, 100);
    const height = tooltip()!.offsetHeight;
    // Low enough that the tooltip fits in the chart only by hanging over the time axis, so it flips.
    const y = area.clientHeight - axis / 2 - 12 - height;
    await hoverAt(T0, 100, y);
    const t = tooltip()!.getBoundingClientRect();
    expect(t.bottom - area.getBoundingClientRect().top).toBeCloseTo(y - 12, 0);
  });

  it('shows last-value labels only while an axis has at most three topics', async () => {
    const topics = (n: number) => Array.from({ length: n }, (_, i) => topic(`T${i}`, [[{ x: T0, y: i }]]));
    await render({ topics: topics(3) });
    expect(allSeries().map((s) => s.options().lastValueVisible)).toEqual([true, true, true]);

    fixture.componentRef.setInput('valuesSubject', topics(4));
    fixture.detectChanges();
    await fixture.whenStable();
    // Four stacked labels pushed apart hide the axis' own ticks.
    expect(allSeries().map((s) => s.options().lastValueVisible)).toEqual([false, false, false, false]);

    fixture.componentRef.setInput('showMultipleYAxes', true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(allSeries().map((s) => s.options().lastValueVisible)).toEqual([true, true, false, false]);
  });

  it('hides and shows a topic from its legend entry', async () => {
    await render({ topics: [topic('A', [[{ x: T0, y: 1 }]]), topic('B', [[{ x: T0, y: 2 }]])] });
    const topicSeries = () => component.legend().map((l) => (component as unknown as Internals).series.get(l.label)!);
    const button = () => fixture.nativeElement.querySelectorAll('.legend-item')[1] as HTMLButtonElement;
    expect(button().getAttribute('aria-pressed')).toBe('true');

    button().click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(topicSeries().map((s) => s.options().visible)).toEqual([true, false]);
    expect(button().getAttribute('aria-pressed')).toBe('false');
    // A hidden topic leaves the tooltip and the hover markers.
    await hoverAt(T0);
    expect(tooltipRows()).toEqual([['A 0', '1']]);

    button().click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(topicSeries().map((s) => s.options().visible)).toEqual([true, true]);
  });

  it('offers a reset zoom button once the user zooms or pans, and resets with it', async () => {
    const points = Array.from({ length: 100 }, (_, i) => ({ x: T0 + i * 1000, y: i }));
    await render({ topics: [topic('A', [points])] });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const reset = () => fixture.nativeElement.querySelector('.reset-zoom') as HTMLButtonElement | null;
    expect(reset()).toBeNull();

    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const container = fixture.nativeElement.querySelector('.chart-container') as HTMLElement;
    const wheel = async () => {
      container.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }));
      await frame();
      fixture.detectChanges();
      await fixture.whenStable();
    };
    // A wheel or drag that leaves the whole range on screen (the edges are fixed) is no zoom.
    await wheel();
    expect(reset()).toBeNull();

    // Stands in for the wheel's own zoom, which the synthetic event doesn't drive.
    component.chart!.timeScale().setVisibleRange({ from: toChartTime(T0 + 10_000), to: toChartTime(T0 + 20_000) });
    await frame();
    await wheel();
    expect(reset()).not.toBeNull();

    reset()!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(reset()).toBeNull();
    expect(component.chart!.timeScale().getVisibleRange()).toEqual({ from: toChartTime(T0), to: toChartTime(T0 + 99_000) });
  });

  it('says what to do while the chart is empty', async () => {
    const hint = () => (fixture.nativeElement.querySelector('.empty-hint') as HTMLElement | null)?.textContent?.trim();
    await render({ topics: [] });
    expect(hint()).toBe('Select a topic to graph');

    const speed = topic('VCU/CarState/speed');
    fixture.componentRef.setInput('valuesSubject', [speed]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(hint()).toBe('No data yet');

    speed.updates.next([[{ x: T0, y: 1 }]]);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(hint()).toBeUndefined();
  });

  it('uses the app font and moves the TradingView attribution out of the plot', async () => {
    await render({ topics: [topic('A', [[{ x: T0, y: 1 }]])] });
    expect(component.chart!.options().layout.fontFamily).toContain('Roboto');
    expect(component.chart!.options().layout.attributionLogo).toBeFalse();
    const link = fixture.nativeElement.querySelector('a.attribution') as HTMLAnchorElement;
    expect(link.href).toBe('https://www.tradingview.com/');
  });
});

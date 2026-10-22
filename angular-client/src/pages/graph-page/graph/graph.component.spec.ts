import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ECharts } from 'echarts/core';
import { BehaviorSubject } from 'rxjs';
import { GraphData, ObservableGraphInfo } from 'src/utils/types.utils';
import CustomGraphComponent from './graph.component';
import { baseGraphChartOption } from './graph-chart-options';

type AnyRecord = Record<string, unknown>;

const config = { maxPoints: 100, yMin: null, yMax: null, rangeMode: 'time' as const, timeRangeMs: 60_000 };

function topic(label: string, points: GraphData[]): ObservableGraphInfo {
  return { label, updates: new BehaviorSubject<GraphData[][]>([points]) };
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

describe('CustomGraphComponent', () => {
  let fixture: ComponentFixture<CustomGraphComponent>;
  let setOption: jasmine.Spy;

  /** The option of the most recent redraw. */
  function lastUpdate(): AnyRecord {
    return setOption.calls.mostRecent().args[0] as AnyRecord;
  }

  beforeEach(() => {
    // Stand in for the ECharts instance (the boundary), so tests see exactly what the component asks it to draw
    TestBed.overrideComponent(CustomGraphComponent, { set: { template: '<div></div>' } });
    fixture = TestBed.createComponent(CustomGraphComponent);
    fixture.componentRef.setInput('graphConfig', config);
    fixture.componentRef.setInput('valuesSubject', []);
    setOption = jasmine.createSpy('setOption');
    const zr = { on: () => undefined };
    fixture.componentInstance.onChartInit({ setOption, isDisposed: () => false, getZr: () => zr } as unknown as ECharts);
    TestBed.tick();
  });

  it('draws each topic as a series once the chart is ready', async () => {
    fixture.componentRef.setInput('valuesSubject', [
      topic('BMS/Pack/Voltage', [{ x: 1000, y: 400 }]),
      topic('BMS/Pack/Current', [{ x: 1000, y: 20 }])
    ]);
    TestBed.tick();
    await nextFrame();

    const series = lastUpdate()['series'] as AnyRecord[];
    expect(series.map((s) => s['name'])).toEqual(['BMS/Pack/Voltage 0', 'BMS/Pack/Current 0']);
    expect(series[0]['data']).toEqual([[1000, 400]]);
    expect(setOption.calls.mostRecent().args[1]).toEqual({ replaceMerge: ['series', 'yAxis'] });
  });

  it('coalesces a burst of telemetry into one redraw per frame', async () => {
    const voltage = topic('BMS/Pack/Voltage', [{ x: 1000, y: 400 }]);
    fixture.componentRef.setInput('valuesSubject', [voltage]);
    TestBed.tick();
    await nextFrame();
    setOption.calls.reset();

    for (let i = 1; i <= 50; i++) {
      voltage.updates.next([[{ x: 1000 + i, y: 400 + i }]]);
    }
    await nextFrame();

    expect(setOption).toHaveBeenCalledTimes(1);
    expect(((lastUpdate()['series'] as AnyRecord[])[0]['data'] as unknown[]).length).toBe(51);
  });

  it('prunes a y-axis when its topic is deselected with multiple y-axes on (#630)', async () => {
    const voltage = topic('BMS/Pack/Voltage', [{ x: 1000, y: 400 }]);
    fixture.componentRef.setInput('showMultipleYAxes', true);
    fixture.componentRef.setInput('valuesSubject', [voltage, topic('BMS/Pack/Current', [{ x: 1000, y: 20 }])]);
    TestBed.tick();
    await nextFrame();
    expect((lastUpdate()['yAxis'] as unknown[]).length).toBe(2);

    fixture.componentRef.setInput('valuesSubject', [voltage]);
    TestBed.tick();
    await nextFrame();

    const yAxis = lastUpdate()['yAxis'] as AnyRecord[];
    expect(yAxis.length).toBe(1);
    expect(yAxis[0]['name']).toBe('BMS/Pack/Voltage ');
  });

  it('keeps a live graph on its time window, and shows the whole buffer when paused', async () => {
    fixture.componentRef.setInput('realTime', true);
    fixture.componentRef.setInput('valuesSubject', [
      topic('BMS/Pack/Voltage', [
        { x: 0, y: 1 },
        { x: 100_000, y: 2 }
      ])
    ]);
    TestBed.tick();
    await nextFrame();
    expect((lastUpdate()['xAxis'] as AnyRecord)['min']).toBe(100_000 - config.timeRangeMs);

    fixture.componentRef.setInput('isPaused', true);
    TestBed.tick();
    await nextFrame();

    expect((lastUpdate()['xAxis'] as AnyRecord)['min']).toBeNull();
  });

  it('ignores telemetry while a live graph is paused', async () => {
    const voltage = topic('BMS/Pack/Voltage', [{ x: 1000, y: 400 }]);
    fixture.componentRef.setInput('realTime', true);
    fixture.componentRef.setInput('valuesSubject', [voltage]);
    TestBed.tick();
    fixture.componentRef.setInput('isPaused', true);
    TestBed.tick();
    await nextFrame();
    setOption.calls.reset();

    voltage.updates.next([[{ x: 2000, y: 401 }]]);
    await nextFrame();

    expect(setOption).not.toHaveBeenCalled();
    expect(fixture.componentInstance.data.get('BMS/Pack/Voltage 0')!.length).toBe(1);
  });
});

describe('CustomGraphComponent with ECharts', () => {
  /** Mounts the real template, so ngx-echarts creates a real chart, and waits for it. */
  async function createChart(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(CustomGraphComponent);
    fixture.componentRef.setInput('graphConfig', config);
    fixture.componentRef.setInput('valuesSubject', [topic('BMS/Pack/Voltage', [{ x: 1000, y: 400 }])]);
    Object.entries(inputs).forEach(([name, value]) => fixture.componentRef.setInput(name, value));
    fixture.detectChanges();

    // ngx-echarts creates the chart on a timer after the view initialises
    for (let i = 0; i < 50 && !fixture.componentInstance.chart; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const chart = fixture.componentInstance.chart!;
    expect(chart).toBeDefined();
    await nextFrame();
    return { fixture, chart };
  }

  it('renders through ngx-echarts into a real chart', async () => {
    const { chart } = await createChart();

    const series = chart.getOption()['series'] as AnyRecord[];
    expect(series.map((s) => s['name'])).toEqual(['BMS/Pack/Voltage 0']);
  });

  it("draws the data back after the toolbox's restore resets the chart", async () => {
    const { chart } = await createChart();

    chart.dispatchAction({ type: 'restore' });
    expect((chart.getOption()['series'] as unknown[]).length).toBe(0);
    await nextFrame();

    expect((chart.getOption()['series'] as unknown[]).length).toBe(1);
  });

  it('keeps drawing after Clear Graph with multiple y-axes on', async () => {
    const voltage = topic('BMS/Pack/Voltage', [{ x: 1000, y: 400 }]);
    const { fixture, chart } = await createChart({ showMultipleYAxes: true, valuesSubject: [voltage] });

    fixture.componentRef.setInput('clearGraph', 1);
    fixture.detectChanges();
    await nextFrame();
    voltage.updates.next([[{ x: 2000, y: 401 }]]);
    await nextFrame();

    const series = chart.getOption()['series'] as AnyRecord[];
    expect(series[0]['data']).toEqual([[2000, 401]]);
    expect((chart.getOption()['yAxis'] as unknown[]).length).toBe(1);
  });

  it('updates the y-axes in place on a redraw instead of rebuilding them', async () => {
    const voltage = topic('BMS/Pack/Voltage', [{ x: 1000, y: 400 }]);
    const { chart } = await createChart({
      showMultipleYAxes: true,
      valuesSubject: [voltage, topic('BMS/Pack/Current', [{ x: 1000, y: 20 }])]
    });
    const axisModel = () => model(chart).getComponent('yAxis', 1);
    const before = axisModel();

    voltage.updates.next([[{ x: 2000, y: 401 }]]);
    await nextFrame();

    expect(axisModel()).toBe(before);
  });

  it('keeps the day boundaries when the first topic is hidden in the legend', async () => {
    const start = new Date(2026, 9, 16, 12).getTime();
    const hours = (h: number) => start + h * 60 * 60 * 1000;
    const { chart } = await createChart({
      valuesSubject: [
        topic('A/topic', [
          { x: hours(0), y: 1 },
          { x: hours(50), y: 2 }
        ]),
        topic('B/topic', [
          { x: hours(0), y: 3 },
          { x: hours(50), y: 4 }
        ])
      ]
    });
    const label = new Date(2026, 9, 17).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    expect(drawnTexts(chart)).toContain(label);

    chart.dispatchAction({ type: 'legendUnSelect', name: 'A/topic 0' });

    expect(drawnTexts(chart)).toContain(label);
  });

  it('keeps the hover line under a still cursor as a live window slides', async () => {
    const voltage = topic('BMS/Pack/Voltage', [{ x: 1000, y: 400 }]);
    const { chart } = await createChart({ realTime: true, valuesSubject: [voltage] });
    const dispatch = spyOn(chart, 'dispatchAction').and.callThrough();

    chart.getZr().trigger('mousemove', { offsetX: 120, offsetY: 40 });
    voltage.updates.next([[{ x: 2000, y: 401 }]]);
    await nextFrame();
    expect(dispatch).toHaveBeenCalledWith({ type: 'showTip', x: 120, y: 40 });

    dispatch.calls.reset();
    chart.getZr().trigger('globalout', {});
    voltage.updates.next([[{ x: 3000, y: 402 }]]);
    await nextFrame();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("keeps a toolbox icon's title showing under a still cursor as a live chart redraws", async () => {
    const voltage = topic('BMS/Pack/Voltage', [{ x: 1000, y: 400 }]);
    const { chart } = await createChart({ realTime: true, valuesSubject: [voltage] });
    const icon = drawnElements(chart).find((el) => el.__title === 'Restore')!;
    const rect = drawnRect(icon);
    const [x, y] = [rect.x + rect.width / 2, rect.y + rect.height / 2];

    chart.getZr().handler.dispatch('mousemove', { zrX: x, zrY: y });
    expect(drawnTexts(chart)).toContain('Restore');
    voltage.updates.next([[{ x: 2000, y: 401 }]]);
    await nextFrame();

    // Every redraw rebuilds the toolbox's icons, dropping the hover state that shows the title
    expect(drawnElements(chart).find((el) => el.__title === 'Restore')).not.toBe(icon);
    expect(drawnTexts(chart)).toContain('Restore');
  });

  it('fits the legend to a new chart width, even while paused', async () => {
    const { fixture, chart } = await createChart({ realTime: true, isPaused: true });
    const legendWidth = () => (chart.getOption()['legend'] as AnyRecord[])[0]['width'] as number;
    expect(legendWidth()).toBeGreaterThan(500);

    (fixture.nativeElement as HTMLElement).style.width = '500px';
    for (let i = 0; i < 5; i++) await nextFrame();

    expect(legendWidth()).toBeLessThan(500 - 100);
    expect(legendWidth()).toBeGreaterThan(500 - 200);
  });

  for (const showMultipleYAxes of [false, true]) {
    it(`shows every topic in the legend at once, above the plot and clear of the toolbox (multiple y-axes ${showMultipleYAxes ? 'on' : 'off'})`, async () => {
      const labels = [
        'BMS/Commands/Max_DC_Current_Target',
        'BMS/Cells/Volts_Avg_Value',
        'BMS/Cells/Temp_Avg_Value',
        'BMS/Segment_Temp/1',
        'BMS/Segment_Total_Volt/0',
        'BMS/Commands/Max_DC_Brake_Current_Target'
      ];
      const { fixture, chart } = await createChart({
        showMultipleYAxes,
        valuesSubject: labels.map((label, i) => topic(label, [{ x: 1000, y: i }]))
      });
      // About the graph page's chart at 1440 px with the sidebar open
      Object.assign((fixture.nativeElement as HTMLElement).style, { width: '1000px', height: '700px' });
      // ngx-echarts resizes the chart up to 100 ms after the host resizes
      await new Promise((resolve) => setTimeout(resolve, 150));
      await nextFrame();

      const elements = drawnElements(chart);
      const toolboxLeft = Math.min(...elements.filter((el) => el.__title).map((el) => drawnRect(el).x));
      const rects = labels.map((label) => {
        const text = elements.find((el) => el.style?.text === `${label} 0`);
        expect(text).withContext(label).toBeDefined();
        return drawnRect(text!);
      });
      rects.forEach((rect, i) => {
        expect(rect.x).withContext(labels[i]).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width)
          .withContext(labels[i])
          .toBeLessThan(toolboxLeft);
      });
      // Wrapped, and as clear of the plot (room for the top y-axis label and day-boundary labels) as one row is
      const bottoms = rects.map((rect) => rect.y + rect.height);
      expect(Math.max(...bottoms)).toBeGreaterThan(bottoms[0]);
      const oneRowClearance = ((baseGraphChartOption().grid as AnyRecord)['top'] as number) - bottoms[0];
      const gridTop = model(chart).getComponent('grid', 0).coordinateSystem.getRect().y;
      expect(gridTop - Math.max(...bottoms)).toBeGreaterThanOrEqual(oneRowClearance - 1);
    });
  }

  describe('in a live window', () => {
    // The window is the last 60 s, so it starts at 40 s; the points at 0 s, 20 s and 38 s are off screen
    const live = () =>
      createChart({
        realTime: true,
        valuesSubject: [
          topic('BMS/Pack/Voltage', [
            { x: 0, y: 1 },
            { x: 20_000, y: 1000 },
            { x: 38_000, y: 2 },
            { x: 50_000, y: 3 },
            { x: 80_000, y: 3.8 },
            { x: 90_000, y: 3.9 },
            { x: 100_000, y: 4 }
          ])
        ]
      });

    /** What ECharts draws: the series' data after dataZoom filtering, and the axes' extents. */
    function drawn(chart: ECharts) {
      const data = model(chart).getSeriesByIndex(0).getData();
      return {
        xs: Array.from({ length: data.count() }, (_, i) => data.get(data.dimensions[0], i)),
        xExtent: model(chart).getComponent('xAxis', 0).axis.scale.getExtent(),
        yExtent: model(chart).getComponent('yAxis', 0).axis.scale.getExtent()
      };
    }

    it("runs the line out to the window's left edge, so a point slides off instead of its segment vanishing", async () => {
      const { chart } = await live();

      const { xs, xExtent } = drawn(chart);
      expect(xExtent[0]).toBe(40_000);
      expect(xs[0]).toBe(40_000);
    });

    it('scales the y-axis to what is on screen, not to points further off it', async () => {
      const { chart } = await live();

      expect(drawn(chart).yExtent[1]).toBeLessThan(1000);
    });

    it('scales the y-axis to a zoomed-in part of the window', async () => {
      const { chart } = await live();

      // The second half of the window, 70 s to 100 s, holds only values 3.8 to 4
      chart.dispatchAction({ type: 'dataZoom', start: 50, end: 100 });
      await nextFrame();

      expect(drawn(chart).yExtent[0]).toBeGreaterThan(3);
    });

    it("scales the y-axis to what is on screen when a slower topic keeps points older than the window's", async () => {
      // Point Range: the window is as wide as the fast topic's last 3 points, 97 s to 100 s,
      // while the slow topic still holds a point at 40 s
      const { chart } = await createChart({
        realTime: true,
        graphConfig: { ...config, rangeMode: 'points', maxPoints: 2 },
        valuesSubject: [
          topic('Fast', [
            { x: 97_000, y: 3 },
            { x: 98_000, y: 3 },
            { x: 99_000, y: 3.5 },
            { x: 100_000, y: 4 }
          ]),
          topic('Slow', [
            { x: 0, y: 1000 },
            { x: 40_000, y: 1000 },
            { x: 96_000, y: 3 },
            { x: 100_000, y: 3.5 }
          ])
        ]
      });

      expect(drawn(chart).xExtent[0]).toBe(97_000);
      expect(drawn(chart).yExtent[1]).toBeLessThan(1000);
    });
  });
});

interface ChartModel {
  getSeriesByIndex(index: number): {
    getData(): { count(): number; dimensions: string[]; get(dim: string, index: number): number };
  };
  getComponent(
    type: string,
    index: number
  ): { axis: { scale: { getExtent(): [number, number] } }; coordinateSystem: { getRect(): DrawnRect } };
}

/** ECharts' internal model of what it draws. */
function model(chart: ECharts): ChartModel {
  return (chart as unknown as { getModel(): ChartModel }).getModel();
}

interface DrawnElement {
  __title?: string;
  style?: { text?: unknown };
  getBoundingRect(): { clone(): DrawnRect };
  getComputedTransform(): unknown;
}

interface DrawnRect {
  x: number;
  y: number;
  width: number;
  height: number;
  applyTransform(transform: unknown): void;
}

/** Every element the chart has painted. */
function drawnElements(chart: ECharts): DrawnElement[] {
  type Node = DrawnElement & { childrenRef?(): Node[] };
  const all: DrawnElement[] = [];
  const visit = (el: Node): void => {
    all.push(el);
    el.childrenRef?.().forEach(visit);
  };
  (chart.getZr() as unknown as { storage: { getRoots(): Node[] } }).storage.getRoots().forEach(visit);
  return all;
}

/** Where an element is painted, in chart pixels. */
function drawnRect(el: DrawnElement): DrawnRect {
  const rect = el.getBoundingRect().clone();
  rect.applyTransform(el.getComputedTransform());
  return rect;
}

/** Every text the chart has painted, such as axis and mark line labels. */
function drawnTexts(chart: ECharts): string[] {
  type Element = {
    ignore?: boolean;
    style?: { text?: unknown };
    childrenRef?(): Element[];
    getTextContent?(): Element | undefined;
  };
  const texts: string[] = [];
  const visit = (el: Element | undefined): void => {
    if (!el || el.ignore) return;
    if (typeof el.style?.text === 'string') texts.push(el.style.text);
    el.childrenRef?.().forEach(visit);
    visit(el.getTextContent?.());
  };
  (chart.getZr() as unknown as { storage: { getRoots(): Element[] } }).storage.getRoots().forEach(visit);
  return texts;
}

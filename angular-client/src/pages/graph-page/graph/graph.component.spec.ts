import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { ECharts } from 'echarts/core';
import { BehaviorSubject } from 'rxjs';
import { GraphData, ObservableGraphInfo } from 'src/utils/types.utils';
import CustomGraphComponent from './graph.component';

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
    fixture.componentInstance.onChartInit({ setOption, isDisposed: () => false } as unknown as ECharts);
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
            { x: 100_000, y: 4 }
          ])
        ]
      });

    /** What ECharts draws: the series' data after dataZoom filtering, and the axes' extents. */
    function drawn(chart: ECharts) {
      const model = (chart as unknown as { getModel(): ChartModel }).getModel();
      const data = model.getSeriesByIndex(0).getData();
      return {
        xs: Array.from({ length: data.count() }, (_, i) => data.get(data.dimensions[0], i)),
        xExtent: model.getComponent('xAxis', 0).axis.scale.getExtent(),
        yExtent: model.getComponent('yAxis', 0).axis.scale.getExtent()
      };
    }

    it("runs the line out to the window's left edge, so a point slides off instead of its segment vanishing", async () => {
      const { chart } = await live();

      const { xs, xExtent } = drawn(chart);
      expect(xExtent[0]).toBe(40_000);
      expect(xs[0]).toBe(38_000);
    });

    it('scales the y-axis to what is on screen, not to points further off it', async () => {
      const { chart } = await live();

      expect(drawn(chart).yExtent[1]).toBeLessThan(1000);
    });
  });
});

interface ChartModel {
  getSeriesByIndex(index: number): {
    getData(): { count(): number; dimensions: string[]; get(dim: string, index: number): number };
  };
  getComponent(type: string, index: number): { axis: { scale: { getExtent(): [number, number] } } };
}

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
  it('renders through ngx-echarts into a real chart', async () => {
    const fixture = TestBed.createComponent(CustomGraphComponent);
    fixture.componentRef.setInput('graphConfig', config);
    fixture.componentRef.setInput('valuesSubject', [topic('BMS/Pack/Voltage', [{ x: 1000, y: 400 }])]);
    fixture.detectChanges();

    // ngx-echarts creates the chart on a timer after the view initialises
    for (let i = 0; i < 50 && !fixture.componentInstance.chart; i++) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    const chart = fixture.componentInstance.chart!;
    expect(chart).toBeDefined();
    await nextFrame();

    const series = chart.getOption()['series'] as AnyRecord[];
    expect(series.map((s) => s['name'])).toEqual(['BMS/Pack/Voltage 0']);
  });
});

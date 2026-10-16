import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AutoscaleInfo, ISeriesApi, MouseEventParams, SeriesType, Time, TimeScaleOptions } from 'lightweight-charts';
import { BehaviorSubject } from 'rxjs';
import { GraphData, ObservableGraphInfo } from 'src/utils/types.utils';
import CustomGraphComponent, { GraphConfig } from './graph.component';
import { toChartTime } from './graph-chart.utils';

const T0 = new Date(2026, 2, 14, 9, 0, 0).getTime();

const config = (overrides: Partial<GraphConfig> = {}): GraphConfig => ({
  maxPoints: 100,
  yMin: null,
  yMax: null,
  rangeMode: 'time',
  timeRangeMs: 30_000,
  ...overrides
});

const topic = (label: string, points: GraphData[][] = []): ObservableGraphInfo => ({
  label,
  updates: new BehaviorSubject<GraphData[][]>(points)
});

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

  const allSeries = (): ISeriesApi<SeriesType, Time>[] => component.chart!.panes()[0].getSeries();
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

  it('labels the time axis with dates on multi-day historical ranges', async () => {
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
    expect(format(toChartTime(T0), 0, 'en-US')).toBe('3/14 09:00');
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

  it('gives each topic its own price scale with multiple y-axes, and one shared axis without', async () => {
    await render({
      topics: [topic('A', [[{ x: T0, y: 1 }]]), topic('B', [[{ x: T0, y: 2 }]]), topic('C', [[{ x: T0, y: 3 }]])],
      multi: true
    });
    expect(allSeries().map((s) => s.options().priceScaleId)).toEqual(['left', 'right', 'overlay-2']);
    expect(allSeries().map((s) => s.options().title)).toEqual(['A 0', 'B 0', 'C 0']);

    fixture.componentRef.setInput('showMultipleYAxes', false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(allSeries().map((s) => s.options().priceScaleId)).toEqual(['left', 'left', 'left']);
    expect(allSeries()[2].data().length).toBe(1);
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

  it('shows each topic’s latest value at the hovered time in the legend', async () => {
    const a = topic('A', [
      [
        { x: T0, y: 1 },
        { x: T0 + 2000, y: 3 }
      ]
    ]);
    const b = topic('B', [[{ x: T0 + 1000, y: 20 }]]);
    await render({ topics: [a, b] });

    // The chart only reports crosshair moves for real pointer events (setCrosshairPosition is silent),
    // so hand the handler what the chart passes it when the pointer is over T0 + 1s.
    const { onCrosshairMove } = component as unknown as { onCrosshairMove: (p: MouseEventParams<Time>) => void };
    onCrosshairMove({
      time: toChartTime(T0 + 1000),
      point: { x: 100, y: 100 },
      seriesData: new Map()
    } as MouseEventParams<Time>);
    fixture.detectChanges();
    await fixture.whenStable();

    const hover = component.hover();
    expect(hover).not.toBeNull();
    expect(hover!.values.get('A 0')).toBe('1');
    expect(hover!.values.get('B 0')).toBe('20');
    const legendValues = Array.from(fixture.nativeElement.querySelectorAll('.legend-value')).map((el) =>
      (el as HTMLElement).textContent?.trim()
    );
    expect(legendValues).toEqual(['1', '20']);

    onCrosshairMove({ seriesData: new Map() } as MouseEventParams<Time>);
    expect(component.hover()).toBeNull();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { GraphData, ObservableGraphInfo } from 'src/utils/types.utils';
import CustomGraphComponent from './graph.component';

type GraphConfig = {
  maxPoints: number;
  yMin: number | null;
  yMax: number | null;
  rangeMode: 'time' | 'points';
  timeRangeMs: number;
};

const baseConfig: GraphConfig = { maxPoints: 1000, yMin: null, yMax: null, rangeMode: 'time', timeRangeMs: 10_000 };

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

function topic(label: string, points: GraphData[] = []): ObservableGraphInfo {
  return { label, updates: new BehaviorSubject<GraphData[][]>([points]) };
}

describe('CustomGraphComponent (dygraphs)', () => {
  let fixture: ComponentFixture<CustomGraphComponent>;
  let component: CustomGraphComponent;

  async function setup(inputs: { values: ObservableGraphInfo[]; config?: Partial<GraphConfig>; realTime?: boolean }) {
    fixture = TestBed.createComponent(CustomGraphComponent);
    component = fixture.componentInstance;
    fixture.nativeElement.style.cssText = 'display: block; width: 600px; height: 400px;';
    document.body.appendChild(fixture.nativeElement);
    fixture.componentRef.setInput('valuesSubject', inputs.values);
    fixture.componentRef.setInput('graphConfig', { ...baseConfig, ...inputs.config });
    fixture.componentRef.setInput('realTime', inputs.realTime ?? false);
    fixture.detectChanges();
    await nextFrame();
  }

  afterEach(() => {
    fixture.destroy();
    fixture.nativeElement.remove();
  });

  it('draws one dygraphs series per topic value, sharing one time column', async () => {
    await setup({
      values: [
        topic('BMS/Pack/Voltage', [
          { x: 1000, y: 1 },
          { x: 3000, y: 3 }
        ]),
        topic('BMS/Pack/Current', [{ x: 2000, y: 20 }])
      ]
    });

    expect(component.chart!.getLabels()).toEqual(['Time', 'BMS/Pack/Voltage 0', 'BMS/Pack/Current 0']);
    expect(component.chart!.numRows()).toBe(3);
    expect(component.chart!.getValue(1, 2)).toBe(20);
  });

  it('coalesces a burst of datapoints into a single redraw per frame', async () => {
    const voltage = topic('BMS/Pack/Voltage', [{ x: 1000, y: 1 }]);
    await setup({ values: [voltage] });
    const update = spyOn(component.chart!, 'updateOptions').and.callThrough();

    for (let i = 2; i <= 50; i++) voltage.updates.next([[{ x: i * 1000, y: i }]]);
    await nextFrame();

    expect(update).toHaveBeenCalledTimes(1);
    expect(component.chart!.numRows()).toBe(50);
  });

  it('drops a deselected topic from the chart and its axis title (#630)', async () => {
    const voltage = topic('BMS/Pack/Voltage', [{ x: 1000, y: 1 }]);
    const current = topic('BMS/Pack/Current', [{ x: 1000, y: 2 }]);
    await setup({ values: [voltage, current] });
    fixture.componentRef.setInput('showMultipleYAxes', true);
    fixture.detectChanges();
    await nextFrame();
    expect(component.chart!.getOption('y2label')).toBe('BMS/Pack/Current');

    fixture.componentRef.setInput('valuesSubject', [voltage]);
    fixture.detectChanges();
    await nextFrame();

    expect(component.chart!.getLabels()).toEqual(['Time', 'BMS/Pack/Voltage 0']);
    expect(component.chart!.getOption('ylabel')).toBe('BMS/Pack/Voltage');
    expect(component.chart!.getOption('y2label')).toBe('');
  });

  it('puts alternate topics on the right-hand axis when multiple y-axes are on', async () => {
    await setup({ values: [topic('A', [{ x: 1, y: 1 }]), topic('B', [{ x: 1, y: 100 }])] });
    expect(component.chart!.numAxes()).toBe(1);

    fixture.componentRef.setInput('showMultipleYAxes', true);
    fixture.detectChanges();
    await nextFrame();

    expect(component.chart!.numAxes()).toBe(2);
  });

  it('shows the latest time window in real-time mode', async () => {
    const speed = topic('VCU/CarState/speed', [
      { x: 0, y: 1 },
      { x: 30_000, y: 2 }
    ]);
    await setup({ values: [speed], realTime: true, config: { timeRangeMs: 10_000 } });

    expect(component.chart!.xAxisRange()).toEqual([20_000, 30_000]);

    speed.updates.next([[{ x: 31_000, y: 3 }]]);
    await nextFrame();
    expect(component.chart!.xAxisRange()).toEqual([21_000, 31_000]);
  });

  it('holds the x window while the user is zoomed in, until they reset the zoom', async () => {
    const speed = topic('VCU/CarState/speed', [
      { x: 0, y: 1 },
      { x: 30_000, y: 2 }
    ]);
    await setup({ values: [speed], realTime: true });
    const chart = component.chart!;

    // What a drag-zoom does: set the window, then call zoomCallback.
    chart.updateOptions({ dateWindow: [22_000, 24_000] });
    chart.getOption('zoomCallback')(22_000, 24_000, chart.yAxisRanges());
    speed.updates.next([[{ x: 31_000, y: 3 }]]);
    await nextFrame();
    expect(chart.xAxisRange()).toEqual([22_000, 24_000]);

    chart.resetZoom();
    await nextFrame();
    expect(chart.xAxisRange()).toEqual([21_000, 31_000]);
  });

  it('fits all data in historical mode', async () => {
    await setup({
      values: [
        topic('VCU/CarState/speed', [
          { x: 0, y: 1 },
          { x: 30_000, y: 2 }
        ])
      ]
    });

    expect(component.chart!.isZoomed('x')).toBeFalse();
  });

  it('applies the configured y range, leaving an unset bound automatic', async () => {
    await setup({
      values: [
        topic('VCU/CarState/speed', [
          { x: 0, y: 10 },
          { x: 1000, y: 20 }
        ])
      ],
      config: { yMin: 0 }
    });
    expect(component.chart!.yAxisRange()[0]).toBe(0);

    fixture.componentRef.setInput('graphConfig', { ...baseConfig, yMin: null, yMax: 100 });
    fixture.detectChanges();
    await nextFrame();

    expect(component.chart!.yAxisRange()[1]).toBe(100);
    expect(component.chart!.yAxisRange()[0]).toBeGreaterThan(0);
  });

  it('ignores datapoints while paused', async () => {
    const speed = topic('VCU/CarState/speed', [{ x: 0, y: 1 }]);
    await setup({ values: [speed] });
    fixture.componentRef.setInput('isPaused', true);
    fixture.detectChanges();

    speed.updates.next([[{ x: 1000, y: 2 }]]);
    await nextFrame();

    expect(component.data.get('VCU/CarState/speed 0')!.length).toBe(1);
  });

  it('empties the chart when the graph is cleared', async () => {
    await setup({ values: [topic('VCU/CarState/speed', [{ x: 0, y: 1 }])] });
    expect(component.chart!.getLabels()!.length).toBe(2);

    // Clearing drops the data; with the same BehaviorSubjects, resubscribing replays their last value.
    fixture.componentRef.setInput('valuesSubject', []);
    fixture.componentRef.setInput('clearGraph', 1);
    fixture.detectChanges();
    await nextFrame();

    expect(component.chart!.getLabels()).toEqual(['Time']);
  });
});

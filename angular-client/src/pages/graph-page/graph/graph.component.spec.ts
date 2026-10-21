import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { GraphData, ObservableGraphInfo } from 'src/utils/types.utils';
import { By } from '@angular/platform-browser';
import { UplotChartComponent } from 'src/components/uplot-chart/uplot-chart.component';
import CustomGraphComponent from './graph.component';

describe('CustomGraphComponent (uPlot)', () => {
  let fixture: ComponentFixture<CustomGraphComponent>;
  let component: CustomGraphComponent;

  const config = { maxPoints: 100, yMin: null, yMax: null, rangeMode: 'time' as const, timeRangeMs: 10_000 };

  const topic = (label: string, points: GraphData[] = []): ObservableGraphInfo => ({
    label,
    updates: new BehaviorSubject<GraphData[][]>([points])
  });

  const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await nextFrame();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function create(inputs: Record<string, unknown>): Promise<void> {
    fixture = TestBed.createComponent(CustomGraphComponent);
    component = fixture.componentInstance;
    Object.assign((fixture.nativeElement as HTMLElement).style, { width: '600px', height: '400px' });
    document.body.appendChild(fixture.nativeElement);
    fixture.componentRef.setInput('graphConfig', config);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await settle();
  }

  afterEach(() => fixture?.destroy());

  it('draws each topic as an aligned uPlot series', async () => {
    await create({
      valuesSubject: [
        topic('A', [
          { x: 1000, y: 1 },
          { x: 3000, y: 3 }
        ]),
        topic('B', [{ x: 2000, y: 20 }])
      ]
    });

    expect(component.chartOptions().series.map((s) => s.label)).toEqual([undefined, 'A 0', 'B 0']);
    expect(component.chartData()).toEqual([
      [1000, 2000, 3000],
      [1, undefined, 3],
      [undefined, 20, undefined]
    ]);
    expect((fixture.nativeElement as HTMLElement).querySelector('.uplot')).not.toBeNull();
  });

  it('adds live points without rebuilding the chart, coalescing a burst into one frame', async () => {
    const a = topic('A', [{ x: 1000, y: 1 }]);
    await create({ valuesSubject: [a], realTime: true });
    const options = component.chartOptions();
    const renderSpy = spyOn(component, 'render').and.callThrough();

    a.updates.next([[{ x: 2000, y: 2 }]]);
    a.updates.next([[{ x: 3000, y: 3 }]]);
    await settle();

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(component.chartOptions()).toBe(options);
    expect(component.chartData()[1]).toEqual([1, 2, 3]);
  });

  it('slides a time window over the newest live data', async () => {
    await create({
      valuesSubject: [
        topic('A', [
          { x: 1000, y: 1 },
          { x: 20_000, y: 2 }
        ])
      ],
      realTime: true
    });

    expect(component.chartXRange()).toEqual({ min: 10_000, max: 20_000 });
  });

  it('auto-fits historical data instead of windowing it', async () => {
    await create({ valuesSubject: [topic('A', [{ x: 1000, y: 1 }])], realTime: false });

    expect(component.chartXRange()).toBeNull();
  });

  // #630: deselecting a topic must prune its series and its y-axis.
  it('rebuilds series and per-topic y-axes to match the selected topics', async () => {
    const a = topic('A', [{ x: 1000, y: 1 }]);
    await create({ valuesSubject: [a, topic('B', [{ x: 1000, y: 2 }])], showMultipleYAxes: true });
    expect(component.chartOptions().axes!.length).toBe(3);

    fixture.componentRef.setInput('valuesSubject', [a]);
    await settle();

    expect(component.chartOptions().series.length).toBe(2);
    expect(component.chartOptions().axes!.map((axis) => axis.label)).toEqual([undefined, 'A']);
  });

  it('applies Y Min/Max to the live chart without rebuilding it', async () => {
    await create({
      valuesSubject: [
        topic('A', [
          { x: 1000, y: 1 },
          { x: 2000, y: 2 }
        ])
      ]
    });
    const wrapper = fixture.debugElement.query(By.directive(UplotChartComponent)).componentInstance as UplotChartComponent;
    const options = component.chartOptions();
    const chart = wrapper.instance;

    fixture.componentRef.setInput('graphConfig', { ...config, yMin: -10, yMax: 10 });
    await settle();

    expect(component.chartOptions()).toBe(options);
    expect(wrapper.instance).toBe(chart);
    expect(chart!.scales['y'].min).toBe(-10);
    expect(chart!.scales['y'].max).toBe(10);
  });

  it('ignores updates while paused and drops the live window to show the whole buffer', async () => {
    const a = topic('A', [
      { x: 15_000, y: 1 },
      { x: 20_000, y: 2 }
    ]);
    await create({ valuesSubject: [a], realTime: true });

    fixture.componentRef.setInput('isPaused', true);
    await settle();
    a.updates.next([[{ x: 30_000, y: 3 }]]);
    await settle();

    expect(component.chartXRange()).toBeNull();
    expect(component.chartData()[0]).toEqual([15_000, 20_000]);
  });

  it('shows a Reset zoom button while zoomed in, which zooms back out to all the data', async () => {
    await create({
      valuesSubject: [
        topic('A', [
          { x: 1000, y: 1 },
          { x: 2000, y: 2 },
          { x: 3000, y: 3 }
        ])
      ]
    });
    const host = fixture.nativeElement as HTMLElement;
    const chart = (fixture.debugElement.query(By.directive(UplotChartComponent)).componentInstance as UplotChartComponent)
      .instance!;
    const resetButton = () => host.querySelector<HTMLButtonElement>('.reset-zoom button');
    expect(resetButton()).toBeNull();

    chart.setScale('x', { min: 1500, max: 2500 });
    await settle();
    expect(resetButton()?.textContent?.trim()).toBe('Reset zoom');

    resetButton()!.click();
    await settle();
    expect(chart.scales['x'].min).toBe(1000);
    expect(chart.scales['x'].max).toBe(3000);
    expect(resetButton()).toBeNull();
  });

  it('never offers Reset zoom on the sliding live window', async () => {
    await create({
      valuesSubject: [
        topic('A', [
          { x: 1000, y: 1 },
          { x: 20_000, y: 2 }
        ])
      ],
      realTime: true
    });

    expect((fixture.nativeElement as HTMLElement).querySelector('.reset-zoom')).toBeNull();
  });

  it('hints to pick a topic while none is selected', async () => {
    await create({ valuesSubject: [] });
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('.empty-hint')?.textContent).toContain('Select a topic');

    fixture.componentRef.setInput('valuesSubject', [topic('A', [{ x: 1000, y: 1 }])]);
    await settle();
    expect(host.querySelector('.empty-hint')).toBeNull();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { Chart } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { By } from '@angular/platform-browser';
import CustomGraphComponent from './graph.component';
import { GraphData, ObservableGraphInfo } from 'src/utils/types.utils';

type GraphConfig = ReturnType<CustomGraphComponent['graphConfig']>;

const BASE_CONFIG: GraphConfig = { maxPoints: 1000, yMin: null, yMax: null, rangeMode: 'time', timeRangeMs: 10_000 };

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const topic = (label: string, points: GraphData[]): ObservableGraphInfo => ({
  label,
  updates: new BehaviorSubject<GraphData[][]>([points])
});

describe('CustomGraphComponent (Chart.js)', () => {
  let fixture: ComponentFixture<CustomGraphComponent>;

  async function render(inputs: Partial<Record<string, unknown>>): Promise<Chart> {
    fixture = TestBed.createComponent(CustomGraphComponent);
    const host = fixture.nativeElement as HTMLElement;
    host.style.width = '600px';
    host.style.height = '300px';
    document.body.appendChild(host);
    fixture.componentRef.setInput('graphConfig', BASE_CONFIG);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    await settle();
    return chart();
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    await nextFrame();
    // The frame's chart sync updates signals the template reads (hasData)
    fixture.detectChanges();
  }

  function chart(): Chart {
    return fixture.debugElement.query(By.directive(BaseChartDirective)).injector.get(BaseChartDirective).chart!;
  }

  afterEach(() => fixture?.destroy());

  it('draws one line per topic value with its points', async () => {
    const c = await render({
      valuesSubject: [
        topic('BMS/Pack/Voltage', [
          { x: 1000, y: 400 },
          { x: 2000, y: 401 }
        ])
      ]
    });

    expect(c.data.datasets.map((d) => d.label)).toEqual(['BMS/Pack/Voltage 0']);
    expect(c.data.datasets[0].data).toEqual([
      { x: 1000, y: 400 },
      { x: 2000, y: 401 }
    ]);
  });

  it('adds new live points to the existing line without replacing it', async () => {
    const voltage = topic('BMS/Pack/Voltage', [{ x: 1000, y: 400 }]);
    const c = await render({ valuesSubject: [voltage], realTime: true });
    const [datasetBefore] = c.data.datasets;

    voltage.updates.next([[{ x: 2000, y: 402 }]]);
    await settle();

    expect(c.data.datasets[0]).toBe(datasetBefore);
    expect(c.data.datasets[0].data.length).toBe(2);
  });

  it('keeps out-of-order points sorted by time', async () => {
    const voltage = topic('V', [{ x: 1000, y: 1 }]);
    const c = await render({ valuesSubject: [voltage] });

    voltage.updates.next([[{ x: 3000, y: 3 }]]);
    voltage.updates.next([[{ x: 2000, y: 2 }]]);
    await settle();

    expect((c.data.datasets[0].data as GraphData[]).map((p) => p.x)).toEqual([1000, 2000, 3000]);
  });

  it('gives each topic its own y-axis when multi-axis is on, and prunes it on deselect (#630)', async () => {
    const voltage = topic('BMS/Pack/Voltage', [{ x: 1000, y: 400 }]);
    const current = topic('BMS/Pack/Current', [{ x: 1000, y: 20 }]);
    const c = await render({ valuesSubject: [voltage, current], showMultipleYAxes: true });

    expect(Object.keys(c.scales).sort()).toEqual(['x', 'y', 'y1']);
    expect(c.data.datasets.map((d) => (d as { yAxisID?: string }).yAxisID)).toEqual(['y', 'y1']);

    fixture.componentRef.setInput('valuesSubject', [voltage]);
    await settle();

    expect(Object.keys(c.scales).sort()).toEqual(['x', 'y']);
  });

  it('shows only the configured time window in real-time mode, ending at the latest point', async () => {
    const c = await render({
      valuesSubject: [
        topic('V', [
          { x: 1_234, y: 1 },
          { x: 31_234, y: 2 }
        ])
      ],
      realTime: true
    });

    // Not rounded out to a "nice" tick: the live edge sits at the right edge, as with ApexCharts' range
    expect(c.scales['x'].min).toBe(31_234 - BASE_CONFIG.timeRangeMs);
    expect(c.scales['x'].max).toBe(31_234);
  });

  it('fits all data in historical mode, without padding out to nice ticks', async () => {
    const c = await render({
      valuesSubject: [
        topic('V', [
          { x: 1_234, y: 1 },
          { x: 28_765, y: 2 }
        ])
      ]
    });

    expect(c.scales['x'].min).toBe(1_234);
    expect(c.scales['x'].max).toBe(28_765);
  });

  it('keeps a usable x-axis around a single point', async () => {
    const c = await render({ valuesSubject: [topic('V', [{ x: 1_792_000_000_000, y: 1 }])] });

    const spanMs = c.scales['x'].max - c.scales['x'].min;
    expect(spanMs).toBeGreaterThan(0);
    expect(spanMs).toBeLessThan(60_000);
  });

  it('puts x-axis ticks on whole hours across a multi-day run, midnights included', async () => {
    const start = new Date(2026, 9, 16, 12, 7, 31, 250).getTime();
    const c = await render({
      valuesSubject: [
        topic('V', [
          { x: start, y: 1 },
          { x: start + 50 * 60 * 60 * 1000, y: 2 }
        ])
      ]
    });

    const ticks = c.scales['x'].ticks.map((t) => t.value);
    expect(ticks.length).toBeGreaterThan(1);
    expect(ticks.filter((v) => v % 1000 !== 0 || new Date(v).getMinutes() !== 0)).toEqual([]);
    expect(ticks).toContain(new Date(2026, 9, 17).getTime());
  });

  it('puts x-axis ticks on whole minutes in a five-minute live window', async () => {
    const start = new Date(2026, 9, 16, 12, 7, 31, 250).getTime();
    const c = await render({
      valuesSubject: [
        topic('V', [
          { x: start, y: 1 },
          { x: start + 10 * 60 * 1000, y: 2 }
        ])
      ],
      realTime: true,
      graphConfig: { ...BASE_CONFIG, timeRangeMs: 5 * 60 * 1000 }
    });

    const ticks = c.scales['x'].ticks.map((t) => t.value);
    expect(ticks.length).toBeGreaterThan(1);
    expect(ticks.filter((v) => v % 60_000 !== 0)).toEqual([]);
  });

  it('applies the configured y-limits', async () => {
    const c = await render({ valuesSubject: [topic('V', [{ x: 0, y: 1 }])] });

    fixture.componentRef.setInput('graphConfig', { ...BASE_CONFIG, yMin: -10, yMax: 50 });
    await settle();

    expect(c.scales['y'].min).toBe(-10);
    expect(c.scales['y'].max).toBe(50);
  });

  it('marks day boundaries on multi-day historical ranges', async () => {
    const start = new Date(2026, 0, 1, 12).getTime();
    const c = await render({
      valuesSubject: [
        topic('V', [
          { x: start, y: 1 },
          { x: start + 36 * 60 * 60 * 1000, y: 2 }
        ])
      ]
    });

    const annotations = c.options.plugins?.annotation?.annotations as unknown[];
    expect(annotations.length).toBe(1);
  });

  it('empties the chart when the graph is cleared', async () => {
    const c = await render({ valuesSubject: [topic('V', [{ x: 0, y: 1 }])] });

    fixture.componentRef.setInput('clearGraph', 1);
    await settle();

    expect(c.data.datasets.length).toBe(0);
  });

  it('stops following the live window while zoomed, and resumes on reset', async () => {
    const voltage = topic('V', [
      { x: 0, y: 1 },
      { x: 30_000, y: 2 }
    ]);
    const c = await render({ valuesSubject: [voltage], realTime: true });

    c.zoomScale('x', { min: 5_000, max: 6_000 }, 'none');
    fixture.componentInstance.zoomed.set(true);
    voltage.updates.next([[{ x: 40_000, y: 3 }]]);
    await settle();
    expect(c.scales['x'].min).toBe(5_000);

    fixture.componentInstance.resetZoom();
    await settle();
    expect(fixture.componentInstance.zoomed()).toBeFalse();
    expect(c.scales['x'].min).toBe(40_000 - BASE_CONFIG.timeRangeMs);
  });

  it('drops the zoom when the data resets, fitting the new data', async () => {
    const c = await render({
      valuesSubject: [
        topic('V', [
          { x: 0, y: 1 },
          { x: 30_000, y: 2 }
        ])
      ]
    });
    c.zoomScale('x', { min: 5_000, max: 6_000 }, 'none');
    fixture.componentInstance.zoomed.set(true);

    fixture.componentRef.setInput('valuesSubject', [
      topic('W', [
        { x: 100_000, y: 1 },
        { x: 160_000, y: 2 }
      ])
    ]);
    await settle();

    expect(fixture.componentInstance.zoomed()).toBeFalse();
    expect(c.scales['x'].min).toBe(100_000);
    expect(c.scales['x'].max).toBe(160_000);
  });

  it('drops the zoom when the graph is cleared', async () => {
    const c = await render({ valuesSubject: [topic('V', [{ x: 0, y: 1 }])] });
    c.zoomScale('x', { min: 0, max: 1_000 }, 'none');
    fixture.componentInstance.zoomed.set(true);

    fixture.componentRef.setInput('clearGraph', 1);
    await settle();

    expect(fixture.componentInstance.zoomed()).toBeFalse();
  });

  function toolbarButton(label: string): HTMLButtonElement {
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    return buttons.find((b) => b.textContent!.trim() === label)!;
  }

  it('zooms in and back out from the toolbar', async () => {
    const c = await render({
      valuesSubject: [
        topic('V', [
          { x: 0, y: 1 },
          { x: 40_000, y: 2 }
        ])
      ]
    });
    expect(toolbarButton('Reset Zoom').disabled).toBeTrue();
    expect(toolbarButton('Zoom Out').disabled).toBeTrue();

    toolbarButton('Zoom In').click();
    await settle();

    expect(fixture.componentInstance.zoomed()).toBeTrue();
    expect(c.scales['x'].max - c.scales['x'].min).toBeLessThan(40_000);
    expect(toolbarButton('Reset Zoom').disabled).toBeFalse();

    toolbarButton('Reset Zoom').click();
    await settle();

    expect(fixture.componentInstance.zoomed()).toBeFalse();
    expect(c.scales['x'].max - c.scales['x'].min).toBe(40_000);
  });

  it('saves the chart as a PNG from the toolbar', async () => {
    await render({ valuesSubject: [topic('V', [{ x: 0, y: 1 }])] });
    const download = spyOn(HTMLAnchorElement.prototype, 'click');

    toolbarButton('Save PNG').click();

    expect(download).toHaveBeenCalledTimes(1);
    const saved = download.calls.mostRecent().object as unknown as HTMLAnchorElement;
    expect(saved.download).toMatch(/\.png$/);
    expect(saved.href).toMatch(/^data:image\/png/);
  });

  const emptyMessage = () => (fixture.nativeElement as HTMLElement).querySelector('.empty-state')?.textContent?.trim();

  it('asks for a topic, instead of drawing epoch-zero axes, when none is selected', async () => {
    await render({ valuesSubject: [] });

    expect(emptyMessage()).toBe('Select a topic to graph');
    expect(toolbarButton('Zoom In').disabled).toBeTrue();
    expect(toolbarButton('Save PNG').disabled).toBeTrue();
  });

  it('says it is waiting until a selected topic has points, then draws them', async () => {
    const voltage = topic('V', []);
    await render({ valuesSubject: [voltage], realTime: true });
    expect(emptyMessage()).toBe('Waiting for data');

    voltage.updates.next([[{ x: 1000, y: 1 }]]);
    await settle();

    expect(emptyMessage()).toBeUndefined();
  });

  it('ignores a drag-zoom on an empty chart, so arriving data is not hidden behind it', async () => {
    const voltage = topic('V', []);
    const c = await render({ valuesSubject: [voltage], realTime: true });

    c.options.plugins!.zoom!.zoom!.onZoomComplete!({ chart: c });
    voltage.updates.next([[{ x: 1000, y: 1 }]]);
    await settle();

    expect(fixture.componentInstance.zoomed()).toBeFalse();
  });

  it('ignores incoming points while paused', async () => {
    const voltage = topic('V', [{ x: 0, y: 1 }]);
    const c = await render({ valuesSubject: [voltage], realTime: true });

    fixture.componentRef.setInput('isPaused', true);
    voltage.updates.next([[{ x: 1000, y: 2 }]]);
    await settle();

    expect(c.data.datasets[0].data.length).toBe(1);
  });
});

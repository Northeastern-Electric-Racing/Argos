import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { Chart } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { By } from '@angular/platform-browser';
import CustomGraphComponent from './graph.component';
import { formatTooltipTime, nearestIndex } from './graph-chart.utils';
import { GraphData, ObservableGraphInfo } from 'src/utils/types.utils';

type GraphConfig = ReturnType<CustomGraphComponent['graphConfig']>;

const BASE_CONFIG: GraphConfig = { maxPoints: 1000, yMin: null, yMax: null, rangeMode: 'time', timeRangeMs: 10_000 };

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

const topic = (label: string, points: GraphData[]): ObservableGraphInfo => ({
  label,
  updates: new BehaviorSubject<GraphData[][]>([points])
});

/** The chart box's size; jsdom does no layout, so the spec supplies it (see beforeEach). */
const CHART_SIZE = { width: 600, height: 300 };

describe('CustomGraphComponent (Chart.js)', () => {
  let fixture: ComponentFixture<CustomGraphComponent>;

  beforeEach(() => {
    // Chart.js sizes the canvas to its container's getBoundingClientRect(), which is 0 x 0 in jsdom. A 0 px wide
    // chart has no room for x ticks, and decimates any series of more than 4 x 0 points down to its first one.
    const layout = Element.prototype.getBoundingClientRect;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      return this.classList.contains('chart-container')
        ? new DOMRect(0, 0, CHART_SIZE.width, CHART_SIZE.height)
        : layout.call(this);
    });
  });

  async function render(inputs: Partial<Record<string, unknown>>): Promise<Chart> {
    fixture = TestBed.createComponent(CustomGraphComponent);
    document.body.appendChild(fixture.nativeElement as HTMLElement);
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

  afterEach(() => {
    fixture?.destroy();
    vi.unstubAllGlobals();
  });

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
    voltage.updates.next([[{ x: 40_000, y: 3 }]]);
    await settle();
    expect(c.scales['x'].min).toBe(5_000);

    fixture.componentInstance.resetZoom();
    await settle();
    expect(fixture.componentInstance.zoomed()).toBe(false);
    expect(c.scales['x'].min).toBe(40_000 - BASE_CONFIG.timeRangeMs);
  });

  describe('zoom and pan gestures in live mode', () => {
    const liveTopic = () =>
      topic('V', [
        { x: 0, y: 1 },
        { x: 30_000, y: 2 }
      ]);

    it('holds a ctrl-wheel zoom as live points arrive, before the zoom completes', async () => {
      const voltage = liveTopic();
      const c = await render({ valuesSubject: [voltage], realTime: true });

      c.canvas.dispatchEvent(
        new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, clientX: 300, clientY: 150, cancelable: true })
      );
      const { min, max } = c.scales['x'];
      expect(max - min).toBeLessThan(BASE_CONFIG.timeRangeMs);
      voltage.updates.next([[{ x: 31_000, y: 3 }]]);
      await settle();

      expect(fixture.componentInstance.zoomed()).toBe(true);
      expect(c.scales['x'].min).toBe(min);
      expect(c.scales['x'].max).toBe(max);
    });

    it('holds a shift-drag pan as live points arrive mid-gesture', async () => {
      const voltage = liveTopic();
      const c = await render({ valuesSubject: [voltage], realTime: true });

      c.options.plugins!.zoom!.pan!.onPanStart!({ chart: c, event: {} as never, point: { x: 300, y: 150 } });
      c.pan({ x: 100 }, undefined, 'none');
      const { min, max } = c.scales['x'];
      expect(max).toBeLessThan(30_000);
      voltage.updates.next([[{ x: 31_000, y: 3 }]]);
      await settle();

      expect(fixture.componentInstance.zoomed()).toBe(true);
      expect(c.scales['x'].min).toBe(min);
      expect(c.scales['x'].max).toBe(max);
    });

    it('zooms a drag to the times under the box, even when live points arrive mid-drag', async () => {
      const voltage = liveTopic();
      const c = await render({ valuesSubject: [voltage], realTime: true });
      const y = c.chartArea.top + 50;
      const [from, to] = [c.chartArea.left + 100, c.chartArea.left + 300];
      const expected = [from, to].map((px) => c.scales['x'].getValueForPixel(px)!);

      c.canvas.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: from, clientY: y, bubbles: true }));
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: to, clientY: y }));
      voltage.updates.next([[{ x: 35_000, y: 3 }]]);
      await settle();
      document.dispatchEvent(new MouseEvent('mouseup', { clientX: to, clientY: y }));
      await settle();

      expect(fixture.componentInstance.zoomed()).toBe(true);
      expect(c.scales['x'].min).toBeCloseTo(expected[0], -1);
      expect(c.scales['x'].max).toBeCloseTo(expected[1], -1);
    });
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

    fixture.componentRef.setInput('valuesSubject', [
      topic('W', [
        { x: 100_000, y: 1 },
        { x: 160_000, y: 2 }
      ])
    ]);
    await settle();

    expect(fixture.componentInstance.zoomed()).toBe(false);
    expect(c.scales['x'].min).toBe(100_000);
    expect(c.scales['x'].max).toBe(160_000);
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
    expect(toolbarButton('Reset Zoom').disabled).toBe(true);
    expect(toolbarButton('Zoom Out').disabled).toBe(true);

    toolbarButton('Zoom In').click();
    await settle();

    expect(fixture.componentInstance.zoomed()).toBe(true);
    expect(c.scales['x'].max - c.scales['x'].min).toBeCloseTo(32_000, 6);
    expect(toolbarButton('Reset Zoom').disabled).toBe(false);

    toolbarButton('Zoom Out').click();
    await settle();

    // Zoom Out undoes Zoom In exactly, but stays zoomed (live windowing still paused)
    expect(c.scales['x'].max - c.scales['x'].min).toBeCloseTo(40_000, 6);
    expect(fixture.componentInstance.zoomed()).toBe(true);

    toolbarButton('Reset Zoom').click();
    await settle();

    expect(fixture.componentInstance.zoomed()).toBe(false);
    expect(c.scales['x'].max - c.scales['x'].min).toBe(40_000);
  });

  it('saves the chart as a PNG from the toolbar', async () => {
    await render({ valuesSubject: [topic('V', [{ x: 0, y: 1 }])] });
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    toolbarButton('Save PNG').click();

    expect(download).toHaveBeenCalledTimes(1);
    const saved = download.mock.contexts.at(-1) as unknown as HTMLAnchorElement;
    expect(saved.download).toMatch(/\.png$/);
    expect(saved.href).toMatch(/^data:image\/png/);
  });

  it('downloads the series shown as CSV from the toolbar, leaving out those hidden from the legend', async () => {
    const c = await render({
      valuesSubject: [topic('V', [{ x: 0, y: 1 }]), topic('I', [{ x: 0, y: 2 }]), topic('T', [{ x: 0, y: 3 }])]
    });
    c.setDatasetVisibility(1, false);
    c.update('none');
    const blobs: Blob[] = [];
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = (blob: Blob) => (blobs.push(blob), 'blob:graph');
        static override revokeObjectURL = vi.fn();
      }
    );
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    toolbarButton('Save CSV').click();

    expect(download).toHaveBeenCalledTimes(1);
    const saved = download.mock.contexts.at(-1) as unknown as HTMLAnchorElement;
    expect(saved.download).toMatch(/\.csv$/);
    expect(blobs[0].type).toBe('text/csv');
    expect((await blobs[0].text()).split('\r\n')[0]).toBe('time,V,T');
    await new Promise((resolve) => setTimeout(resolve));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:graph');
  });

  const emptyMessage = () => (fixture.nativeElement as HTMLElement).querySelector('.empty-state')?.textContent?.trim();

  it('asks for a topic, instead of drawing epoch-zero axes, when none is selected', async () => {
    await render({ valuesSubject: [] });

    expect(emptyMessage()).toBe('Select a topic to graph');
    expect(toolbarButton('Zoom In').disabled).toBe(true);
    expect(toolbarButton('Save PNG').disabled).toBe(true);
    expect(toolbarButton('Save CSV').disabled).toBe(true);
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

    c.options.plugins!.zoom!.zoom!.onZoom!({ chart: c, trigger: 'drag' });
    voltage.updates.next([[{ x: 1000, y: 1 }]]);
    await settle();

    expect(fixture.componentInstance.zoomed()).toBe(false);
  });

  it('ignores incoming points while paused, and holds the paused window still', async () => {
    const voltage = topic('V', [
      { x: 25_000, y: 1 },
      { x: 30_000, y: 2 }
    ]);
    const c = await render({ valuesSubject: [voltage], realTime: true });

    fixture.componentRef.setInput('isPaused', true);
    await settle();
    const { min, max } = c.scales['x'];
    voltage.updates.next([[{ x: 31_000, y: 2 }]]);
    fixture.componentRef.setInput('showMultipleYAxes', true);
    await settle();

    expect(c.data.datasets[0].data.length).toBe(2);
    expect(c.scales['x'].min).toBe(min);
    expect(c.scales['x'].max).toBe(max);
  });

  it('empties the chart when the graph is cleared while paused', async () => {
    const c = await render({ valuesSubject: [topic('V', [{ x: 0, y: 1 }])], realTime: true });
    fixture.componentRef.setInput('isPaused', true);
    await settle();

    fixture.componentRef.setInput('clearGraph', 1);
    await settle();

    expect(c.data.datasets.length).toBe(0);
    expect(emptyMessage()).toBe('Waiting for data');
  });

  it('drops the zoom on pause and shows the latest live window', async () => {
    const voltage = topic('V', [
      { x: 0, y: 1 },
      { x: 30_000, y: 2 }
    ]);
    const c = await render({ valuesSubject: [voltage], realTime: true });
    c.zoomScale('x', { min: 5_000, max: 6_000 }, 'none');
    voltage.updates.next([[{ x: 40_000, y: 3 }]]);
    await settle();

    fixture.componentRef.setInput('isPaused', true);
    await settle();

    expect(fixture.componentInstance.zoomed()).toBe(false);
    expect(c.scales['x'].min).toBe(40_000 - BASE_CONFIG.timeRangeMs);
    expect(c.scales['x'].max).toBe(40_000);
  });

  it('keeps the x-axis and shared y-axis when every series is hidden from the legend', async () => {
    const c = await render({ valuesSubject: [topic('V', [{ x: 0, y: 1 }])], realTime: true });

    c.setDatasetVisibility(0, false);
    c.update('none');

    expect(c.scales['x'].options.display).toBe(true);
    expect(c.scales['y'].options.display).toBe(true);
  });

  describe('hover', () => {
    /** Moves the pointer to a time and y pixel on the plot; Chart.js handles pointer moves once per frame. */
    async function hover(c: Chart, time: number, y = 100): Promise<void> {
      const x = c.scales['x'].getPixelForValue(time);
      c.canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: x, clientY: y, bubbles: true }));
      await settle();
    }

    const tooltipRows = (c: Chart) => c.tooltip!.body.flatMap(({ lines }) => lines);

    /** Centres of the filled circles of the hover dot's radius drawn since the last clear (tooltip swatches too). */
    function hoverDots(c: Chart): { x: number; y: number }[] {
      const ctx = c.ctx as unknown as { __getDrawCalls(): { type: string; props: { path?: DrawEvent[] } }[] };
      type DrawEvent = { type: string; props: { x: number; y: number; radius: number } };
      return ctx
        .__getDrawCalls()
        .filter(({ type }) => type === 'fill')
        .flatMap(({ props }) => props.path ?? [])
        .filter(({ type, props }) => type === 'arc' && props.radius === 4)
        .map(({ props: { x, y } }) => ({ x: Math.round(x), y: Math.round(y) }));
    }

    /** Samples every second from `from` to `to` seconds after `t0`, all of value `y`. */
    const everySecond = (from: number, to: number, y: number, t0 = 0): GraphData[] =>
      Array.from({ length: to - from + 1 }, (_, i) => ({ x: t0 + (from + i) * 1000, y }));
    const pixelOf = (c: Chart, { x, y }: GraphData) => ({
      x: Math.round(c.scales['x'].getPixelForValue(x)),
      y: Math.round(c.scales['y'].getPixelForValue(y))
    });

    it("shows each series' nearest real sample, with its dot on that sample", async () => {
      const c = await render({
        valuesSubject: [
          topic('V', [
            { x: 0, y: 0 },
            { x: 10_000, y: 10 },
            { x: 20_000, y: 0 }
          ])
        ]
      });
      (c.ctx as unknown as { __clearDrawCalls(): void }).__clearDrawCalls();

      await hover(c, 7_500);

      expect(tooltipRows(c)).toEqual(['V 0: 10']);
      expect(c.tooltip!.title).toEqual([formatTooltipTime(10_000, 20_000)]);
      expect(hoverDots(c)).toContainEqual(pixelOf(c, { x: 10_000, y: 10 }));
    });

    it('shows real samples of a decimated series, with their dots on the drawn line', async () => {
      // More points than Chart.js draws across the plot's width, so min-max decimation thins what it draws
      const noisy = Array.from({ length: 6_000 }, (_, i) => ({ x: i * 10, y: Math.round(Math.sin(i * 1.7) * 1000) }));
      const c = await render({ valuesSubject: [topic('Noisy', noisy)] });
      expect(c.data.datasets[0].data.length).toBeLessThan(noisy.length);

      for (const time of [12_345, 33_333, 50_005]) {
        (c.ctx as unknown as { __clearDrawCalls(): void }).__clearDrawCalls();
        await hover(c, time);
        const { x } = c.scales;
        const shown = noisy[nearestIndex(noisy, x.getValueForPixel(Math.round(x.getPixelForValue(time)))!)];

        expect(tooltipRows(c)).toEqual([`Noisy 0: ${shown.y.toLocaleString('en-US')}`]);
        expect(hoverDots(c)).toContainEqual(pixelOf(c, shown));
      }
    });

    it('leaves out a series when the pointer is in a gap in it, or well past its first or last sample', async () => {
      const t0 = new Date(2026, 9, 17, 13, 50, 0).getTime();
      const c = await render({
        valuesSubject: [
          topic('Long', everySecond(0, 20, 1, t0)),
          topic('Early', everySecond(0, 5, 2, t0)),
          topic('Late', everySecond(15, 20, 3, t0)),
          topic('Gappy', [...everySecond(0, 4, 4, t0), ...everySecond(16, 20, 4, t0)])
        ]
      });

      await hover(c, t0 + 10_000);
      expect(tooltipRows(c)).toEqual(['Long 0: 1']);

      // Within two sample periods of Early's last sample and of Gappy's first stretch
      await hover(c, t0 + 5_800);
      expect(tooltipRows(c)).toEqual(['Long 0: 1', 'Early 0: 2 (13:50:05)', 'Gappy 0: 4 (13:50:04)']);
    });

    it("titles the tooltip with the nearest sample's time, and gives a row taken at another time its own", async () => {
      const t0 = new Date(2026, 9, 17, 13, 50, 0).getTime();
      // A samples on whole seconds, B 700 ms later
      const c = await render({
        valuesSubject: [topic('A', everySecond(0, 20, 1, t0)), topic('B', everySecond(0, 20, 2, t0 + 700))]
      });

      // Nearest samples: A at :02 (200 ms off), B at :01.700 (100 ms off)
      await hover(c, t0 + 1_800);
      expect(c.tooltip!.title).toEqual(['10/17/2026, 13:50:01']);
      expect(tooltipRows(c)).toEqual(['A 0: 1 (13:50:02)', 'B 0: 2']);

      // Nearest samples: A at :05 and B at :05.700, both 13:50:05 to the second
      await hover(c, t0 + 5_300);
      expect(c.tooltip!.title).toEqual(['10/17/2026, 13:50:05']);
      expect(tooltipRows(c)).toEqual(['A 0: 1', 'B 0: 2']);
    });

    it('flips the tooltip at the right edge by the size of what it now shows', async () => {
      const wide = 'W'.repeat(120);
      const c = await render({
        valuesSubject: [
          topic('V', [
            { x: 0, y: 1 },
            { x: 20_000, y: 1 }
          ]),
          topic(wide, [
            { x: 15_000, y: 2 },
            { x: 20_000, y: 2 }
          ])
        ]
      });
      await hover(c, 2_000);
      expect(tooltipRows(c)).toEqual(['V 0: 1']);

      // Room for the narrow tooltip on the cursor's right, but not for the wide one that now shows
      const time = c.scales['x'].getValueForPixel(c.chartArea.right - 60)!;
      await hover(c, time);

      const tooltip = c.tooltip!;
      expect(tooltipRows(c).length).toBe(2);
      expect(tooltip.xAlign).toBe('right');
      expect(tooltip.x + tooltip.width).toBeLessThanOrEqual(c.chartArea.right);
    });
  });

  it('hides the axes while there is no data', async () => {
    const c = await render({ valuesSubject: [topic('V', [])], realTime: true });

    expect(c.scales['x'].options.display).toBe(false);
    expect(c.scales['y'].options.display).toBe(false);
  });
});

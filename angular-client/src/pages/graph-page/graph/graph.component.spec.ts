import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { GraphData, ObservableGraphInfo } from 'src/utils/types.utils';
import Dygraph from 'dygraphs';
import CustomGraphComponent from './graph.component';
import { SERIES_COLORS, hoverTimeLabel, multiDayLabel, singleDayLabel } from './graph-chart.utils';

type GraphConfig = {
  maxPoints: number;
  yMin: number | null;
  yMax: number | null;
  rangeMode: 'time' | 'points';
  timeRangeMs: number;
};

const baseConfig: GraphConfig = { maxPoints: 1000, yMin: null, yMax: null, rangeMode: 'time', timeRangeMs: 10_000 };

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/** dygraphs' own handler for a vertical drag (pixel rows, top then bottom). */
const dragY = (chart: Dygraph, top: number, bottom: number) =>
  (chart as unknown as { doZoomY_(lowY: number, highY: number): void }).doZoomY_(
    chart.toDomYCoord(top),
    chart.toDomYCoord(bottom)
  );

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

  it('keeps following live data, and keeps the y zoom, after a vertical (y-only) drag', async () => {
    const speed = topic('VCU/CarState/speed', [
      { x: 0, y: 1 },
      { x: 30_000, y: 2 }
    ]);
    await setup({ values: [speed], realTime: true, config: { timeRangeMs: 10_000 } });
    const chart = component.chart!;
    expect(chart.isZoomed('y')).toBeFalse();

    dragY(chart, 1.8, 1.2);
    const zoomed = chart.yAxisRange();
    speed.updates.next([[{ x: 31_000, y: 3 }]]);
    await nextFrame();

    expect(chart.xAxisRange()).toEqual([21_000, 31_000]);
    expect(chart.yAxisRange()).toEqual(zoomed);

    chart.resetZoom();
    await nextFrame();
    expect(chart.yAxisRange()).not.toEqual(zoomed);
  });

  it('keeps a vertical drag made while paused, through Play', async () => {
    const speed = topic('VCU/CarState/speed', [
      { x: 0, y: 1 },
      { x: 30_000, y: 2 }
    ]);
    await setup({ values: [speed], realTime: true, config: { timeRangeMs: 10_000 } });
    const chart = component.chart!;
    fixture.componentRef.setInput('isPaused', true);
    fixture.detectChanges();

    dragY(chart, 1.8, 1.2);
    const zoomed = chart.yAxisRange();
    expect(component.zoomed()).toBeTrue();

    fixture.componentRef.setInput('isPaused', false);
    fixture.detectChanges();
    speed.updates.next([[{ x: 31_000, y: 3 }]]);
    await nextFrame();

    expect(chart.xAxisRange()).toEqual([21_000, 31_000]);
    expect(chart.yAxisRange()).toEqual(zoomed);
  });

  it('keeps a vertical drag through a resize, and drops it on reset', async () => {
    // A resize (the Reset zoom button appearing shrinks the chart) makes dygraphs re-read its y ranges from the options.
    await setup({
      values: [
        topic('VCU/CarState/speed', [
          { x: 0, y: 1 },
          { x: 30_000, y: 2 }
        ])
      ]
    });
    const chart = component.chart!;
    dragY(chart, 1.8, 1.2);
    const zoomed = chart.yAxisRange();

    chart.resize(600, 350);
    expect(chart.yAxisRange()).toEqual(zoomed);

    component.resetZoom();
    chart.resize(600, 400);
    expect(chart.isZoomed('y')).toBeFalse();
  });

  it('keeps the hovered point in the tooltip, at full precision, across live redraws', async () => {
    const speed = topic('VCU/CarState/speed', [
      { x: 0, y: 1.2345 },
      { x: 1000, y: 1.2345 },
      { x: 2000, y: 1.2345 }
    ]);
    await setup({ values: [speed], realTime: true, config: { timeRangeMs: 10_000 } });
    const chart = component.chart!;
    const legend = fixture.nativeElement.querySelector('.tooltip') as HTMLElement;
    const canvases = Array.from(fixture.nativeElement.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const at = (type: string, init: MouseEventInit) =>
      canvases.forEach((canvas) => canvas.dispatchEvent(new MouseEvent(type, { bubbles: true, ...init })));

    const rect = canvases[0].getBoundingClientRect();
    at('mousemove', { clientX: rect.left + chart.toDomXCoord(1000), clientY: rect.top + chart.toDomYCoord(1.2345) });
    expect(legend.textContent).toContain(`${hoverTimeLabel(1000)}:`);
    expect(legend.textContent).toContain('1.2345');

    // getSelection() keeps its old row even after a redraw blanks the legend, so check the legend itself.
    // The live window moves on a second, so the row under the still pointer is then the one at 2000.
    speed.updates.next([[{ x: 3000, y: 1.2345 }]]);
    await nextFrame();
    expect(legend.textContent).toContain(`${hoverTimeLabel(2000)}:`);
    expect(legend.textContent).toContain('1.2345');

    at('mouseout', { relatedTarget: document.body });
    speed.updates.next([[{ x: 4000, y: 1.2345 }]]);
    await nextFrame();
    expect(legend.textContent).not.toContain('1.2345');
  });

  it('lists every series in the hover tooltip, with its latest value at or before the hovered time', async () => {
    // Live topics rarely share a timestamp, so most rows hold a value for one series only.
    await setup({
      values: [
        topic('A', [
          { x: 0, y: 1.5 },
          { x: 2000, y: 2.5 }
        ]),
        topic('B', [{ x: 1000, y: 7.25 }]),
        topic('C', [{ x: 3000, y: 9.125 }])
      ]
    });
    const chart = component.chart!;
    const legend = fixture.nativeElement.querySelector('.tooltip') as HTMLElement;
    const canvases = Array.from(fixture.nativeElement.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const rect = canvases[0].getBoundingClientRect();
    canvases.forEach((canvas) =>
      canvas.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          clientX: rect.left + chart.toDomXCoord(2000),
          clientY: rect.top + chart.toDomYCoord(2.5)
        })
      )
    );

    expect(legend.textContent).toContain(`${hoverTimeLabel(2000)}:`);
    expect(legend.textContent).toContain('A 0:\u00a02.5');
    expect(legend.textContent).toContain('B 0:\u00a07.25');
    // C has no sample at or before 2000, so it shows its first one.
    expect(legend.textContent).toContain('C 0:\u00a09.125');
  });

  it('floats the tooltip beside the pointer, flipping to stay on the chart, and hides it when the pointer leaves', async () => {
    await setup({
      values: [
        topic('A', [
          { x: 0, y: 0 },
          { x: 1000, y: 10 }
        ])
      ]
    });
    const chart = component.chart!;
    const tooltip = fixture.nativeElement.querySelector('.tooltip') as HTMLElement;
    const canvases = Array.from(fixture.nativeElement.querySelectorAll('canvas')) as HTMLCanvasElement[];
    const rect = canvases[0].getBoundingClientRect();
    const host = (fixture.nativeElement as HTMLElement).getBoundingClientRect();
    const at = (type: string, init: MouseEventInit) =>
      canvases.forEach((canvas) => canvas.dispatchEvent(new MouseEvent(type, { bubbles: true, ...init })));
    const box = () => {
      const r = tooltip.getBoundingClientRect();
      return { left: r.left - host.left, right: r.right - host.left, top: r.top - host.top, bottom: r.bottom - host.top };
    };

    // Near the top left: below and to the right of the pointer.
    const x0 = chart.toDomXCoord(0);
    const y0 = chart.toDomYCoord(9);
    at('mousemove', { clientX: rect.left + x0, clientY: rect.top + y0 });
    expect(getComputedStyle(tooltip).display).not.toBe('none');
    expect(box().left).toBeGreaterThan(x0);
    expect(box().top).toBeGreaterThan(y0);

    // Near the bottom right: flipped above and to the left of the pointer, inside the host.
    const x1 = chart.toDomXCoord(1000);
    const y1 = chart.toDomYCoord(1);
    at('mousemove', { clientX: rect.left + x1, clientY: rect.top + y1 });
    expect(box().right).toBeLessThan(x1);
    expect(box().bottom).toBeLessThan(y1);
    expect(box().left).toBeGreaterThanOrEqual(0);

    at('mouseout', { relatedTarget: document.body });
    expect(getComputedStyle(tooltip).display).toBe('none');
  });

  it('lists each series under the chart in its line colour', async () => {
    await setup({ values: [topic('A', [{ x: 1, y: 1 }]), topic('B', [{ x: 1, y: 2 }])] });
    fixture.detectChanges();

    const entries = Array.from(fixture.nativeElement.querySelectorAll('.legend-entry')) as HTMLElement[];
    expect(entries.map((e) => e.textContent!.trim())).toEqual(['A', 'B']);
    const swatch = (e: HTMLElement) => getComputedStyle(e.querySelector('.legend-swatch')!).borderBottomColor;
    const probe = document.createElement('div');
    document.body.appendChild(probe);
    const rgb = (color: string) => {
      probe.style.color = color;
      return getComputedStyle(probe).color;
    };
    expect(entries.map(swatch)).toEqual(SERIES_COLORS.slice(0, 2).map(rgb));
    probe.remove();
  });

  it('hides a line when its legend entry is clicked, and shows it again on a second click', async () => {
    const a = topic('A', [{ x: 1000, y: 1 }]);
    const b = topic('B', [{ x: 1000, y: 100 }]);
    await setup({ values: [a, b], realTime: true });
    fixture.componentRef.setInput('showMultipleYAxes', true);
    fixture.detectChanges();
    await nextFrame();
    fixture.detectChanges();
    const chart = component.chart!;
    const entryB = () => fixture.nativeElement.querySelectorAll('.legend-entry')[1] as HTMLButtonElement;

    entryB().click();
    fixture.detectChanges();
    expect(chart.visibility()).toEqual([true, false]);
    expect(chart.getOption('y2label')).toBe('');
    expect(entryB().getAttribute('aria-pressed')).toBe('false');
    expect(entryB().classList).toContain('hidden-series');

    // Stays hidden through live redraws.
    b.updates.next([[{ x: 2000, y: 100 }]]);
    await nextFrame();
    expect(chart.visibility()).toEqual([true, false]);

    entryB().click();
    fixture.detectChanges();
    expect(chart.visibility()).toEqual([true, true]);
    expect(chart.getOption('y2label')).toBe('B');
    expect(entryB().getAttribute('aria-pressed')).toBe('true');
  });

  it('hides and shows lines while paused, without moving the x window', async () => {
    const a = topic('A', [{ x: 1000, y: 1 }]);
    await setup({ values: [a, topic('B', [{ x: 1000, y: 100 }])] });
    fixture.componentRef.setInput('isPaused', true);
    fixture.detectChanges();
    await nextFrame();
    fixture.detectChanges();
    const chart = component.chart!;
    const before = chart.xAxisRange();

    (fixture.nativeElement.querySelectorAll('.legend-entry')[1] as HTMLButtonElement).click();

    expect(chart.visibility()).toEqual([true, false]);
    expect(chart.xAxisRange()).toEqual(before);
    // The y axis fits the lines still shown.
    expect(chart.yAxisRange()[1]).toBeLessThan(100);
  });

  it('forgets a hidden line once its topic is deselected', async () => {
    const a = topic('A', [{ x: 1, y: 1 }]);
    const b = topic('B', [{ x: 1, y: 2 }]);
    await setup({ values: [a, b] });
    fixture.detectChanges();
    (fixture.nativeElement.querySelectorAll('.legend-entry')[1] as HTMLButtonElement).click();

    fixture.componentRef.setInput('valuesSubject', [a]);
    fixture.detectChanges();
    await nextFrame();
    fixture.componentRef.setInput('valuesSubject', [a, topic('B', [{ x: 1, y: 2 }])]);
    fixture.detectChanges();
    await nextFrame();

    expect(component.chart!.visibility()).toEqual([true, true]);
  });

  it('drops a zoom window when the mode changes', async () => {
    const speed = topic('VCU/CarState/speed', [
      { x: 0, y: 1 },
      { x: 30_000, y: 2 }
    ]);
    await setup({ values: [speed], realTime: true });
    const chart = component.chart!;
    chart.updateOptions({ dateWindow: [22_000, 24_000] });
    chart.getOption('zoomCallback')(22_000, 24_000, chart.yAxisRanges());

    fixture.componentRef.setInput('realTime', false);
    fixture.detectChanges();
    speed.updates.next([
      [
        { x: 100_000, y: 1 },
        { x: 200_000, y: 2 }
      ]
    ]);
    await nextFrame();

    expect(chart.isZoomed('x')).toBeFalse();
    expect(chart.xAxisRange()).toEqual([100_000, 200_000]);
    expect(component.zoomed()).toBeFalse();
  });

  it('drops a zoom window when the topics change', async () => {
    const speed = topic('VCU/CarState/speed', [
      { x: 0, y: 1 },
      { x: 30_000, y: 2 }
    ]);
    await setup({ values: [speed], realTime: true, config: { timeRangeMs: 10_000 } });
    const chart = component.chart!;
    chart.updateOptions({ dateWindow: [22_000, 24_000] });
    chart.getOption('zoomCallback')(22_000, 24_000, chart.yAxisRanges());

    fixture.componentRef.setInput('valuesSubject', [
      topic('VCU/CarState/speed', [
        { x: 100_000, y: 1 },
        { x: 130_000, y: 2 }
      ])
    ]);
    fixture.detectChanges();
    await nextFrame();

    expect(chart.xAxisRange()).toEqual([120_000, 130_000]);
    expect(component.zoomed()).toBeFalse();
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

  it('switches to date labels and day boundary lines on a multi-day historical range', async () => {
    const speed = topic('VCU/CarState/speed', [
      { x: new Date(2026, 0, 1, 12).getTime(), y: 1 },
      { x: new Date(2026, 0, 1, 18).getTime(), y: 2 }
    ]);
    await setup({ values: [speed] });
    // getOptionForAxis is public dygraphs API that @types/dygraphs leaves out.
    const chart = component.chart! as unknown as Dygraph & { getOptionForAxis(name: string, axis: 'x'): unknown };
    const boundaries = () => (component as unknown as { dayBoundaryTimes: number[] }).dayBoundaryTimes;
    expect(chart.getOptionForAxis('axisLabelFormatter', 'x')).toBe(singleDayLabel);
    expect(boundaries()).toEqual([]);

    speed.updates.next([[{ x: new Date(2026, 0, 3, 12).getTime(), y: 3 }]]);
    await nextFrame();

    expect(chart.getOptionForAxis('axisLabelFormatter', 'x')).toBe(multiDayLabel);
    expect(boundaries()).toEqual([new Date(2026, 0, 2).getTime(), new Date(2026, 0, 3).getTime()]);
  });

  it('centres a single historical point in a one-minute window, so the x axis has labels', async () => {
    await setup({ values: [topic('VCU/CarState/speed', [{ x: 100_000, y: 1 }])] });

    expect(component.chart!.xAxisRange()).toEqual([70_000, 130_000]);
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

  it("colours series from develop's fixed ApexCharts palette, keeping a colour when a topic is added", async () => {
    const a = topic('A', [{ x: 1, y: 1 }]);
    const b = topic('B', [{ x: 1, y: 2 }]);
    await setup({ values: [a, b] });
    expect(component.chart!.getColors()).toEqual(SERIES_COLORS.slice(0, 2));
    expect(component.chart!.getOption('strokeWidth')).toBe(3);

    fixture.componentRef.setInput('valuesSubject', [a, b, topic('C', [{ x: 1, y: 3 }])]);
    fixture.detectChanges();
    await nextFrame();

    expect(component.chart!.getColors()).toEqual(SERIES_COLORS.slice(0, 3));
  });

  it('gives the right-hand axis its own round ticks, and spaces y ticks out', async () => {
    await setup({ values: [topic('A', [{ x: 1, y: 1 }]), topic('B', [{ x: 1, y: 100 }])] });
    fixture.componentRef.setInput('showMultipleYAxes', true);
    fixture.detectChanges();
    await nextFrame();
    // getOptionForAxis is public dygraphs API that @types/dygraphs leaves out.
    const chart = component.chart! as unknown as { getOptionForAxis(name: string, axis: 'y' | 'y2'): unknown };
    expect(chart.getOptionForAxis('independentTicks', 'y2')).toBeTrue();
    expect(chart.getOptionForAxis('pixelsPerLabel', 'y')).toBe(50);
    expect(chart.getOptionForAxis('pixelsPerLabel', 'y2')).toBe(50);
  });

  it('shows a Reset zoom button only while the user is zoomed, and resets on click', async () => {
    const speed = topic('VCU/CarState/speed', [
      { x: 0, y: 1 },
      { x: 30_000, y: 2 }
    ]);
    await setup({ values: [speed], realTime: true });
    const chart = component.chart!;
    const button = () => fixture.nativeElement.querySelector('.reset-zoom button') as HTMLButtonElement | null;
    expect(button()).toBeNull();

    chart.updateOptions({ dateWindow: [22_000, 24_000] });
    chart.getOption('zoomCallback')(22_000, 24_000, chart.yAxisRanges());
    fixture.detectChanges();
    expect(button()).not.toBeNull();

    button()!.click();
    await nextFrame();
    fixture.detectChanges();
    expect(chart.xAxisRange()).toEqual([20_000, 30_000]);
    expect(button()).toBeNull();
  });

  it('shows a hint instead of an empty axis until a topic has data', async () => {
    await setup({ values: [] });
    fixture.detectChanges();
    const hint = () => fixture.nativeElement.querySelector('.empty-message') as HTMLElement | null;
    expect(hint()?.textContent).toContain('Select a topic');

    fixture.componentRef.setInput('valuesSubject', [topic('A')]);
    fixture.detectChanges();
    await nextFrame();
    fixture.detectChanges();
    expect(hint()?.textContent).toContain('No data for the selected topics');

    fixture.componentRef.setInput('valuesSubject', [topic('A', [{ x: 1, y: 1 }])]);
    fixture.detectChanges();
    await nextFrame();
    fixture.detectChanges();
    expect(hint()).toBeNull();
  });

  it('empties the chart when the graph is cleared', async () => {
    await setup({ values: [topic('VCU/CarState/speed', [{ x: 0, y: 1 }])] });
    expect(component.chart!.getLabels()!.length).toBe(2);

    // Only clearGraph changes, so the topics' subscriptions stay and nothing replays their data.
    fixture.componentRef.setInput('clearGraph', 1);
    fixture.detectChanges();
    await nextFrame();

    expect(component.empty()).toBeTrue();
    expect(component.chart!.getLabels()).toEqual(['Time']);
  });

  it('empties the chart when the graph is cleared while paused, and still holds it for later redraws', async () => {
    await setup({
      values: [
        topic('VCU/CarState/speed', [
          { x: 0, y: 1 },
          { x: 30_000, y: 2 }
        ])
      ],
      realTime: true
    });
    fixture.componentRef.setInput('isPaused', true);
    fixture.detectChanges();
    await nextFrame();

    // What Clear Graph does: drop the topics and bump clearGraph.
    fixture.componentRef.setInput('valuesSubject', []);
    fixture.componentRef.setInput('clearGraph', 1);
    fixture.detectChanges();
    await nextFrame();
    fixture.detectChanges();

    expect(component.chart!.getLabels()).toEqual(['Time']);
    const hint = fixture.nativeElement.querySelector('.empty-message') as HTMLElement | null;
    expect(hint?.textContent).toContain('Select a topic');

    const update = spyOn(component.chart!, 'updateOptions').and.callThrough();
    component.updateChart();
    await nextFrame();
    expect(update).not.toHaveBeenCalled();
  });
});

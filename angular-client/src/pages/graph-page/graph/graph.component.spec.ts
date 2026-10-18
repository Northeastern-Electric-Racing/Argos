import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlotlyComponent } from 'angular-plotly.js';
import type { LayoutAxis } from 'plotly.js';
import { BehaviorSubject } from 'rxjs';
import { GraphData, ObservableGraphInfo } from 'src/utils/types.utils';
import CustomGraphComponent from './graph.component';
import { toWallClockMs } from './graph-layout.utils';

// Stands in for angular-plotly.js's <plotly-plot>, which needs WebGL; the tests check what the
// graph hands the plot (traces, layout, revision), not Plotly's drawing.
@Component({ selector: 'plotly-plot', template: '' })
class PlotlyPlotStubComponent {
  data = input<unknown>();
  layout = input<unknown>();
  config = input<unknown>();
  revision = input<number>();
  updateOnlyWithRevision = input<boolean>();
  innerStyle = input<unknown>();
  initialized = output<void>();
}

type GraphConfig = ReturnType<CustomGraphComponent['graphConfig']>;

const baseConfig: GraphConfig = { maxPoints: 100, yMin: null, yMax: null, rangeMode: 'time', timeRangeMs: 60_000 };

describe('CustomGraphComponent (Plotly)', () => {
  let fixture: ComponentFixture<CustomGraphComponent>;
  let graph: CustomGraphComponent;
  let frames: FrameRequestCallback[];

  /** Run the pending animation frame(s), i.e. the coalesced redraw. */
  function flushFrames(): void {
    const pending = frames;
    frames = [];
    pending.forEach((cb) => cb(0));
  }

  function setup(inputs: { realTime?: boolean; config?: Partial<GraphConfig>; topics?: string[] } = {}): void {
    TestBed.overrideComponent(CustomGraphComponent, {
      remove: { imports: [PlotlyComponent] },
      add: { imports: [PlotlyPlotStubComponent] }
    });
    fixture = TestBed.createComponent(CustomGraphComponent);
    graph = fixture.componentInstance;
    const values: ObservableGraphInfo[] = (inputs.topics ?? []).map((label) => ({
      label,
      updates: new BehaviorSubject<GraphData[][]>([])
    }));
    fixture.componentRef.setInput('valuesSubject', values);
    fixture.componentRef.setInput('graphConfig', { ...baseConfig, ...inputs.config });
    fixture.componentRef.setInput('realTime', inputs.realTime ?? false);
    fixture.componentRef.setInput('limitRange', inputs.realTime ?? false);
    fixture.detectChanges();
    flushFrames();
  }

  function push(label: string, points: GraphData[]): void {
    graph.graphInfoCallback({ label, data: [points] });
  }

  function yAxes(): Partial<LayoutAxis>[] {
    const layout = graph.layout() as Record<string, unknown>;
    return Object.keys(layout)
      .filter((key) => /^yaxis\d*$/.test(key))
      .sort()
      .map((key) => layout[key] as Partial<LayoutAxis>);
  }

  beforeEach(() => {
    frames = [];
    spyOn(window, 'requestAnimationFrame').and.callFake((cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
  });

  it('keeps each series sorted by time, inserting late points in place', () => {
    setup();
    push('VCU/CarState/speed', [
      { x: 1000, y: 1 },
      { x: 3000, y: 3 }
    ]);
    push('VCU/CarState/speed', [{ x: 2000, y: 2 }]);

    const series = graph.data.get('VCU/CarState/speed 0')!;
    expect(series.x).toEqual([1000, 2000, 3000].map(toWallClockMs));
    expect(series.y).toEqual([1, 2, 3]);
  });

  it('draws a scattergl line per series that shares the series arrays', () => {
    setup();
    push('BMS/Pack/Voltage', [{ x: 1000, y: 400 }]);
    flushFrames();

    const [trace] = graph.traces();
    expect(trace.type).toBe('scattergl');
    expect(trace.mode).toBe('lines');
    expect(trace.x).toBe(graph.data.get('BMS/Pack/Voltage 0')!.x);
  });

  it('coalesces a burst of updates into one redraw per frame, once the plot is ready', () => {
    setup();
    graph.onPlotInitialized();
    flushFrames();
    const before = graph.revision();

    push('A', [{ x: 1, y: 1 }]);
    push('A', [{ x: 2, y: 2 }]);
    push('A', [{ x: 3, y: 3 }]);
    expect(graph.revision()).toBe(before);

    flushFrames();
    expect(graph.revision()).toBe(before + 1);
  });

  it('does not push revisions before the plot has initialized', () => {
    setup();
    push('A', [{ x: 1, y: 1 }]);
    flushFrames();

    expect(graph.revision()).toBe(0);
    expect(graph.traces().length).toBe(1);
  });

  it('ignores data while paused', () => {
    setup({ realTime: true });
    fixture.componentRef.setInput('isPaused', true);
    fixture.detectChanges();

    push('A', [{ x: 1, y: 1 }]);

    expect(graph.data.size).toBe(0);
  });

  it('redraws a multi y-axis toggle while paused', () => {
    setup({ realTime: true });
    push('A', [{ x: 1, y: 1 }]);
    fixture.componentRef.setInput('isPaused', true);
    fixture.detectChanges();
    flushFrames();

    fixture.componentRef.setInput('showMultipleYAxes', true);
    fixture.detectChanges();
    flushFrames();

    expect(yAxes()[0].anchor).toBeUndefined();
    expect(yAxes()[0].title).toEqual(jasmine.objectContaining({ text: 'A ' }));
  });

  it('starts a fresh zoom when the graph config changes, so new y bounds always apply', () => {
    setup();
    const before = graph.layout().uirevision;

    fixture.componentRef.setInput('graphConfig', { ...baseConfig, yMin: 5 });
    fixture.detectChanges();
    flushFrames();

    expect(graph.layout().uirevision).not.toBe(before);
    expect(graph.layout().yaxis?.autorangeoptions).toEqual({ minallowed: 5 });
  });

  it('shows the latest time window in real-time mode', () => {
    setup({ realTime: true, config: { timeRangeMs: 10_000 } });
    push('A', [
      { x: 100_000, y: 1 },
      { x: 120_000, y: 2 }
    ]);
    flushFrames();

    const end = toWallClockMs(120_000);
    expect(graph.layout().xaxis?.range).toEqual([end - 10_000, end]);
  });

  it('trims points that fall out of the live time window', () => {
    setup({ realTime: true, config: { timeRangeMs: 10_000 } });
    push('A', [{ x: 0, y: 1 }]);
    push('A', [{ x: 20_000, y: 2 }]);

    expect(graph.data.get('A 0')!.y).toEqual([2]);
  });

  it('autoranges x in historical mode', () => {
    setup();
    push('A', [{ x: 0, y: 1 }]);
    flushFrames();

    expect(graph.layout().xaxis?.autorange).toBeTrue();
    expect(graph.layout().xaxis?.range).toBeUndefined();
  });

  it('marks each day boundary on multi-day historical data', () => {
    setup();
    // Noon on day 0 to noon on day 3, local time: three midnights in between.
    const noon = new Date(2026, 9, 1, 12).getTime();
    push('A', [
      { x: noon, y: 1 },
      { x: noon + 3 * 24 * 60 * 60 * 1000, y: 2 }
    ]);
    flushFrames();

    expect(graph.layout().shapes?.length).toBe(3);
    expect(graph.layout().annotations?.length).toBe(3);
    expect(graph.layout().xaxis?.tickformat).toBe('%-m/%-d %H:%M');
  });

  // Regression coverage for #630: with "Multiple Y-Axes" on, the y-axis set must always
  // match the currently selected topics.
  describe('multi y-axis sync (#630)', () => {
    beforeEach(() => {
      setup();
      fixture.componentRef.setInput('showMultipleYAxes', true);
      fixture.detectChanges();
      push('BMS/Pack/Voltage', [{ x: 1, y: 1 }]);
      push('BMS/Pack/Current', [{ x: 1, y: 1 }]);
      flushFrames();
    });

    it('builds one y-axis per topic and puts each series on its own axis', () => {
      expect(yAxes().length).toBe(2);
      expect(graph.traces().map((t) => t.yaxis)).toEqual(['y', 'y2']);
    });

    it('prunes a y-axis when its topic is deselected (removed from the data map)', () => {
      graph.data.delete('BMS/Pack/Current 0');
      graph.updateChart();
      flushFrames();

      expect(yAxes().length).toBe(1);
      expect(yAxes()[0].title).toEqual(jasmine.objectContaining({ text: 'BMS/Pack/Voltage ' }));
    });

    it('alternates y-axis sides so stacked axes stay readable', () => {
      push('BMS/Pack/Temp', [{ x: 1, y: 1 }]);
      flushFrames();

      expect(yAxes().map((y) => y.side)).toEqual(['left', 'right', 'left']);
    });
  });
});

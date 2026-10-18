import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  OnDestroy,
  signal,
  untracked
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, takeUntil } from 'rxjs';
import { PlotlyComponent, PlotlyService } from 'angular-plotly.js';
import Plotly from 'plotly.js-gl2d-dist-min';
import type { Config, Layout, PlotData } from 'plotly.js';
import { binarySearchInsertIndex } from 'src/utils/array.utils';
import { GraphInfo, ObservableGraphInfo } from 'src/utils/types.utils';
import { buildLayout, buildTraces, computeDataSpan, latestX, Series, toWallClockMs } from './graph-layout.utils';

// The gl2d partial bundle (scatter + scattergl) instead of the full plotly.js build. Set statically
// rather than through PlotlyModule.forRoot so the bundle stays in the graph page's lazy chunk.
PlotlyService.setPlotly(Plotly);

@Component({
  selector: 'graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css'],
  standalone: true,
  imports: [PlotlyComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class CustomGraphComponent implements OnDestroy {
  private destroyRef = inject(DestroyRef);
  /** Emits when the topics change, ending the subscriptions made for the previous ones. */
  private valuesChange$ = new Subject<void>();
  showMultipleYAxes = input<boolean>(false);
  valuesSubject = input.required<ObservableGraphInfo[]>();
  limitRange = input(true);
  isPaused = input<boolean>(false);
  realTime = input<boolean>(false);
  clearGraph = input<number>(0);
  graphConfig = input.required<{
    maxPoints: number;
    yMin: number | null;
    yMax: number | null;
    rangeMode: 'time' | 'points';
    timeRangeMs: number;
  }>();
  range = input<number | undefined>(undefined);

  /** label (topic + value index) -> its points; x is wall-clock ms (see toWallClockMs). */
  data = new Map<string, Series>();
  timeRangeMs: number | undefined = undefined;

  // What the plot is drawn from. angular-plotly.js only redraws when `revision` bumps, so each
  // frame is exactly one Plotly.react call, never a diff of the traces in DoCheck.
  readonly traces = signal<Partial<PlotData>[]>([]);
  readonly layout = signal<Partial<Layout>>({});
  readonly revision = signal(0);
  readonly config: Partial<Config> = { displaylogo: false, responsive: true };

  private plotReady = false;
  private frame: number | undefined;
  private dataRevision = 0;
  private uiRevision = 0;
  /** Set by resetRange: the next frame autoranges x, and draws even while paused. */
  private autorangeNext = false;
  /** The next frame draws even while paused, for view changes (like the y-axis toggle) that need no new data. */
  private drawNext = false;

  constructor() {
    effect(() => {
      if (this.isPaused()) {
        untracked(() => this.resetRange());
      }
    });

    effect(() => {
      this.graphConfig();
      // A fresh zoom, like ApexCharts' reset on new options: under an unchanged uirevision Plotly
      // keeps a user's y zoom over new Y Min/Max bounds.
      this.uiRevision++;
      untracked(() => this.resetRange());
    });

    effect(() => {
      this.realTime();
      this.clearGraph();
      this.valuesSubject();
      this.data = new Map();
      // New topics or a cleared graph start from a fresh zoom.
      this.uiRevision++;
      untracked(() => this.resetRange());
    });

    effect(() => {
      // Per-topic axes are rebuilt from the data map every frame, so they stay matched to the
      // selected topics (#630); the toggle just needs a redraw.
      this.showMultipleYAxes();
      this.drawNext = true;
      untracked(() => this.scheduleRender());
    });

    effect(() => {
      // End the subscriptions made for the previous topics
      this.valuesChange$.next();

      this.valuesSubject().forEach(({ label, updates }) => {
        updates
          .pipe(takeUntil(this.valuesChange$), takeUntilDestroyed(this.destroyRef))
          .subscribe((data) => this.graphInfoCallback({ label, data }));
      });

      untracked(() => this.updateChart());
    });
  }

  ngOnDestroy(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.data.clear();
  }

  /** angular-plotly.js finished its first newPlot; from here on revisions reach the chart. */
  onPlotInitialized(): void {
    this.plotReady = true;
    this.scheduleRender();
  }

  updateChart = () => {
    // Skip chart updates if paused
    if (this.isPaused() && this.limitRange()) {
      return;
    }
    this.scheduleRender();
  };

  resetRange() {
    this.timeRangeMs = undefined;
    this.autorangeNext = true;
    this.scheduleRender();
  }

  /** Coalesce bursts of incoming data into at most one redraw per animation frame. */
  private scheduleRender(): void {
    if (this.frame !== undefined) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      this.render();
    });
  }

  private render(): void {
    const autorange = this.autorangeNext;
    const force = autorange || this.drawNext;
    this.autorangeNext = false;
    this.drawNext = false;
    if (this.isPaused() && this.limitRange() && !force) {
      return;
    }

    const multipleYAxes = this.showMultipleYAxes();
    const config = this.graphConfig();

    // Only constrain the x-axis range in real-time mode; historical mode auto-fits all data
    let xRange: [number, number] | undefined;
    if (this.realTime() && !autorange) {
      const rangeMs = config.rangeMode === 'time' ? config.timeRangeMs : this.timeRangeMs;
      const end = latestX(this.data);
      if (rangeMs !== undefined && end !== null) xRange = [end - rangeMs, end];
    }

    this.traces.set(buildTraces(this.data, multipleYAxes));
    this.layout.set(
      buildLayout({
        seriesNames: Array.from(this.data.keys()),
        multipleYAxes,
        yMin: config.yMin,
        yMax: config.yMax,
        xRange,
        // Skip the O(series) span scan in real-time mode: live ranges are never multi-day.
        span: this.realTime() ? null : computeDataSpan(this.data),
        uiRevision: this.uiRevision,
        dataRevision: ++this.dataRevision
      })
    );
    if (this.plotReady) {
      this.revision.update((r) => r + 1);
    }
  }

  graphInfoCallback = (info: GraphInfo) => {
    // Skip processing if paused
    if (this.isPaused()) {
      return;
    }
    info.data.forEach((value, i) => {
      const seriesLabel = info.label + ' ' + i;
      let line = this.data.get(seriesLabel);
      if (!line) {
        line = { x: [], y: [] };
        this.data.set(seriesLabel, line);
      }

      value.forEach((val) => {
        const x = toWallClockMs(val.x);
        const y = Math.round(val.y * 10000) / 10000;

        // if the point is in order according to it's timestamp, just push it to the end of the line
        if (line.x.length === 0 || x >= line.x[line.x.length - 1]) {
          line.x.push(x);
          line.y.push(y);
        } else {
          // Out of order: binary search for correct sorted position
          // (very rare but it's nice to be able to assume sorted data for efficient trimming later)
          const idx = binarySearchInsertIndex(line.x, x);
          line.x.splice(idx, 0, x);
          line.y.splice(idx, 0, y);
        }
      });

      // Trim after processing all points in this series batch
      if (this.realTime() && line.x.length > 0) {
        const config = this.graphConfig();
        const newestX = line.x[line.x.length - 1];

        if (config.rangeMode === 'time') {
          // remove point if outside the time range + 10% buffer (for better UX)
          const buffer = config.timeRangeMs * 0.1;
          const cutoff = newestX - config.timeRangeMs - buffer;
          if (line.x[0] < cutoff) {
            line.x.shift();
            line.y.shift();
          }
        } else if (line.x.length > config.maxPoints * 1.1) {
          const shiftedX = line.x.shift();
          line.y.shift();
          // point based trim requires is to calculate the max time range we can show that
          // doesn't show points being deleted. So we default to smallest range.
          const timeDiff = shiftedX !== undefined ? newestX - shiftedX : 0;
          this.timeRangeMs = timeDiff < (this.timeRangeMs ?? Number.MAX_SAFE_INTEGER) ? timeDiff : this.timeRangeMs;
        }
      }
    });

    this.updateChart();
  };
}

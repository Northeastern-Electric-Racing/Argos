import {
  Component,
  effect,
  input,
  OnDestroy,
  ChangeDetectionStrategy,
  untracked,
  inject,
  DestroyRef,
  signal,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, takeUntil } from 'rxjs';
import uPlot from 'uplot';
import { binarySearchInsertIndex } from 'src/utils/array.utils';
import { GraphInfo, ObservableGraphInfo } from 'src/utils/types.utils';
import { UplotChartComponent, UplotChartOptions, UplotXRange } from 'src/components/uplot-chart/uplot-chart.component';
import { ButtonComponent } from 'src/components/argos-button/argos-button.component';
import { alignSeries, buildGraphChartOptions, dataSpan, DAY_MS, SeriesColumns } from './graph-chart.utils';

@Component({
  selector: 'graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css'],
  standalone: true,
  imports: [UplotChartComponent, ButtonComponent],
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

  // label -> the topic's points as x and y columns, kept sorted by x
  data = new Map<string, SeriesColumns>();
  timeRangeMs: number | undefined = undefined;

  /** What the uPlot wrapper draws. Options change only when the chart's structure does; data changes every frame. */
  chartOptions = signal<UplotChartOptions>(
    buildGraphChartOptions({
      keys: [],
      multipleYAxes: false,
      yBounds: () => ({ yMin: null, yMax: null }),
      isMultiDay: () => false
    })
  );
  chartData = signal<uPlot.AlignedData>([[]]);
  chartXRange = signal<UplotXRange | null>(null);
  /** Whether the user has zoomed in from the full data range, which shows the Reset zoom button. */
  zoomed = signal(false);
  private chart = viewChild(UplotChartComponent);

  /** The series the current chartOptions were built for: a different set rebuilds the chart. */
  private seriesKeys: string[] = [];
  private isMultiDay = false;
  /** Pending animation frame: live updates are coalesced so a burst of messages draws once. */
  private frame: number | null = null;

  constructor() {
    effect(() => {
      if (this.isPaused()) {
        untracked(() => this.resetRange());
      }
    });

    // Multiple y-axes change the chart's scales and axes, so they rebuild it.
    effect(() => {
      this.showMultipleYAxes();
      untracked(() => {
        this.rebuildOptions();
        this.resetRange();
      });
    });

    // The rest of the config is read at range time (Y Min/Max) or per frame, so the chart is kept:
    // rescaling in place keeps the user's zoom and the series hidden from the legend.
    effect(() => {
      this.graphConfig();
      untracked(() => {
        this.resetRange();
        this.chart()?.rescale();
      });
    });

    effect(() => {
      this.realTime();
      this.clearGraph();
      this.valuesSubject();
      untracked(() => {
        this.data = new Map();
        this.timeRangeMs = undefined;
        this.render();
      });
    });

    effect(() => {
      const values = this.valuesSubject();
      untracked(() => {
        // End the subscriptions made for the previous topics
        this.valuesChange$.next();
        values.forEach(({ label, updates }) => {
          updates
            .pipe(takeUntil(this.valuesChange$), takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => this.graphInfoCallback({ label, data }));
        });
        this.updateChart();
      });
    });
  }

  ngOnDestroy(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
    this.data.clear();
  }

  /** Schedules a redraw on the next animation frame (one per frame however many updates arrive). */
  updateChart = () => {
    // Skip chart updates if paused
    if (untracked(this.isPaused) && untracked(this.limitRange)) {
      return;
    }
    if (this.frame !== null) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = null;
      this.render();
    });
  };

  /** Pushes the current data to the chart, rebuilding it only when the set of series changed. */
  render(): void {
    const keys = Array.from(this.data.keys());
    if (!sameKeys(keys, this.seriesKeys)) {
      this.seriesKeys = keys;
      this.rebuildOptions();
    }

    const lines = Array.from(this.data.values());
    // Multi-day historical ranges get per-day boundary lines (x labels follow the visible span on their own).
    // Skip the O(series) span scan in real-time mode: realtime ranges are bounded and never multi-day.
    const span = untracked(this.realTime) ? null : dataSpan(lines);
    this.isMultiDay = !!span && span.spanMs > DAY_MS;

    this.chartData.set(alignSeries(lines));
    this.chartXRange.set(this.liveWindow(lines));
  }

  /** Real-time mode slides a window over the newest data; historical mode auto-fits all of it. */
  private liveWindow(lines: SeriesColumns[]): UplotXRange | null {
    if (!untracked(this.realTime)) return null;
    const config = untracked(this.graphConfig);
    const rangeMs = config.rangeMode === 'time' ? config.timeRangeMs : this.timeRangeMs;
    if (rangeMs === undefined) return null;
    let latestX = -Infinity;
    for (const { xs } of lines) {
      if (xs.length > 0 && xs[xs.length - 1] > latestX) latestX = xs[xs.length - 1];
    }
    if (!isFinite(latestX)) return null;
    return { min: latestX - rangeMs, max: latestX };
  }

  private rebuildOptions(): void {
    this.chartOptions.set(this.buildOptions(this.seriesKeys));
  }

  private buildOptions(keys: string[]): UplotChartOptions {
    return buildGraphChartOptions({
      keys,
      multipleYAxes: untracked(this.showMultipleYAxes),
      yBounds: () => untracked(this.graphConfig),
      isMultiDay: () => this.isMultiDay,
      onZoomChange: (zoomed) => this.zoomed.set(zoomed),
      autoFitsX: () => untracked(this.chartXRange) === null
    });
  }

  /**
   * Whether a series hidden from the legend stays hidden: while its topic is selected. Real time re-subscribes its
   * topics on a config change, and they come back a frame or more apart, so a missing series alone means nothing.
   */
  keepHiddenSeries = (label: uPlot.Series['label']): boolean =>
    typeof label === 'string' &&
    untracked(this.valuesSubject).some((topic) => label.slice(0, label.lastIndexOf(' ')) === topic.label);

  /** Zooms back out to all the data, as a double-click on the plot does. */
  resetZoom = () => {
    const chart = this.chart()?.instance;
    const xs = chart?.data[0];
    if (!chart || !xs?.length) return;
    chart.setScale('x', { min: xs[0], max: xs[xs.length - 1] });
  };

  graphInfoCallback = (info: GraphInfo) => {
    // Skip processing if paused
    if (untracked(this.isPaused)) {
      return;
    }
    info.data.forEach((value, i) => {
      const seriesLabel = info.label + ' ' + i;
      if (!this.data.has(seriesLabel)) {
        this.data.set(seriesLabel, { xs: [], ys: [] });
      }
      const { xs, ys } = this.data.get(seriesLabel)!;

      value.forEach((val) => {
        const y = Math.round(val.y * 10000) / 10000;

        // if the point is in order according to it's timestamp, just push it to the end of the line
        if (xs.length === 0 || val.x >= xs[xs.length - 1]) {
          xs.push(val.x);
          ys.push(y);
        } else {
          // Out of order: binary search for correct sorted position
          // (very rare but it's nice to be able to assume sorted data for efficient trimming later)
          const idx = binarySearchInsertIndex(xs, val.x);
          xs.splice(idx, 0, val.x);
          ys.splice(idx, 0, y);
        }
      });

      // Trim after processing all points in this series batch
      if (untracked(this.realTime) && xs.length > 0) {
        const config = untracked(this.graphConfig);
        const latestX = xs[xs.length - 1];

        if (config.rangeMode === 'time') {
          // remove point if outside the time range + 10% buffer (for better UX)
          const buffer = config.timeRangeMs * 0.1;
          const cutoff = latestX - config.timeRangeMs - buffer;
          if (xs[0] < cutoff) {
            xs.shift();
            ys.shift();
          }
        } else if (xs.length > config.maxPoints * 1.1) {
          const shiftedX = xs.shift();
          ys.shift();
          // point based trim requires is to calculate the max time range we can show that
          // doesn't show points being deleted. So we default to smallest range.
          const timeDiff = shiftedX !== undefined ? latestX - shiftedX : 0;
          this.timeRangeMs = timeDiff < (this.timeRangeMs ?? Number.MAX_SAFE_INTEGER) ? timeDiff : this.timeRangeMs;
        }
      }
    });

    this.updateChart();
  };

  /** Drops the live window so the whole buffer shows (and can be zoomed), e.g. while paused. */
  resetRange() {
    this.timeRangeMs = undefined;
    this.chartXRange.set(null);
  }
}

const sameKeys = (a: string[], b: string[]) => a.length === b.length && a.every((key, i) => key === b[i]);

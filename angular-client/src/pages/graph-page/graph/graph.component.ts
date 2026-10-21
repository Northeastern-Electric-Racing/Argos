import {
  Component,
  effect,
  input,
  OnDestroy,
  ChangeDetectionStrategy,
  untracked,
  inject,
  DestroyRef,
  viewChild,
  signal,
  afterNextRender
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, takeUntil } from 'rxjs';
import {
  Chart,
  ChartDataset,
  Decimation,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Tooltip
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import zoomPlugin from 'chartjs-plugin-zoom';
import { BaseChartDirective, provideCharts } from 'ng2-charts';
import { binarySearchInsertIndex } from 'src/utils/array.utils';
import { GraphData, GraphInfo, ObservableGraphInfo } from 'src/utils/types.utils';
import {
  buildBaseOptions,
  buildDayBoundaryAnnotations,
  buildYScales,
  computeDataSpan,
  DAY_MS,
  SERIES_COLORS,
  yAxisIdFor
} from './graph-chart.utils';

type LineDataset = ChartDataset<'line', GraphData[]>;

@Component({
  selector: 'graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css'],
  standalone: true,
  imports: [BaseChartDirective],
  // Register only what the line chart uses, so the rest of Chart.js tree-shakes out
  providers: [
    provideCharts({
      registerables: [
        LineController,
        LineElement,
        PointElement,
        LinearScale,
        Tooltip,
        Legend,
        Decimation,
        zoomPlugin,
        annotationPlugin
      ]
    })
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class CustomGraphComponent implements OnDestroy {
  private destroyRef = inject(DestroyRef);
  /** Emits when the topics change, ending the subscriptions made for the previous ones. */
  private valuesChange$ = new Subject<void>();
  private chartDirective = viewChild(BaseChartDirective);
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

  /** True once the user zooms or pans; live windowing pauses until they reset. */
  readonly zoomed = signal(false);
  // label -> x,y (topic, data point). These arrays are handed to Chart.js as-is (parsing: false).
  data = new Map<string, GraphData[]>();
  timeRangeMs: number | undefined = undefined;
  private datasets = new Map<string, LineDataset>();
  private frame: number | undefined;

  readonly chartData: { datasets: LineDataset[] } = { datasets: [] };
  readonly chartOptions = buildBaseOptions({ onZoom: () => this.zoomed.set(true) });

  constructor() {
    afterNextRender(() => this.updateChart());
    effect(() => {
      if (this.isPaused()) {
        untracked(() => this.resetRange());
      }
    });
    effect(() => {
      this.graphConfig();
      untracked(() => this.resetRange());
    });

    effect(() => {
      this.realTime();
      this.clearGraph();
      this.valuesSubject();
      this.data = new Map();
      this.datasets.clear();
      this.timeRangeMs = undefined;
      // A zoom window from the old data would leave the new data off-screen
      untracked(() => this.resetZoom());
    });

    effect(() => {
      // Per-topic axes are rebuilt every frame (see syncChart), so they stay matched to the selected topics (#630)
      this.showMultipleYAxes();
      untracked(() => this.updateChart());
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
    if (this.frame !== undefined) {
      cancelAnimationFrame(this.frame);
      this.frame = undefined;
    }
    this.data.clear();
    this.datasets.clear();
  }

  private get chart(): Chart<'line', GraphData[]> | undefined {
    return this.chartDirective()?.chart as Chart<'line', GraphData[]> | undefined;
  }

  /**
   * Asks for a redraw on the next animation frame. Bursts of incoming points (many topics,
   * high rates) collapse into one Chart.js update per frame instead of one per message.
   */
  updateChart = () => {
    // Skip chart updates if paused
    if (this.isPaused() && this.limitRange()) {
      return;
    }
    if (this.frame !== undefined) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      this.syncChart();
    });
  };

  /** Pushes the current series, axes, x-window and annotations into Chart.js and redraws without animation. */
  private syncChart(): void {
    const { chart } = this;
    if (!chart || (this.isPaused() && this.limitRange())) return;
    const multipleYAxes = this.showMultipleYAxes();
    const config = this.graphConfig();
    const keys = Array.from(this.data.keys());

    // Reuse dataset objects across frames: Chart.js keys its per-dataset state (legend toggles) on identity
    chart.data.datasets = keys.map((key, index) => {
      let dataset = this.datasets.get(key);
      if (!dataset) {
        const color = SERIES_COLORS[this.datasets.size % SERIES_COLORS.length];
        dataset = { label: key, data: this.data.get(key)!, borderColor: color, backgroundColor: color };
        this.datasets.set(key, dataset);
      }
      dataset.yAxisID = yAxisIdFor(index, multipleYAxes);
      return dataset;
    });

    const options = chart.config.options!;
    const scales = options.scales!;
    for (const id of Object.keys(scales)) {
      if (id !== 'x') delete scales[id];
    }
    const colors = chart.data.datasets.map((dataset) => dataset.borderColor as string);
    Object.assign(scales, buildYScales(keys, multipleYAxes, config, colors));

    const span = computeDataSpan(this.data);

    // Only constrain the x-axis range in real-time mode, and not while the user is zoomed in;
    // historical mode auto-fits all data
    if (!this.zoomed()) {
      let effectiveRange: number | undefined = undefined;
      if (this.realTime()) {
        effectiveRange = config.rangeMode === 'time' ? config.timeRangeMs : this.timeRangeMs;
      }
      const x = scales['x']!;
      if (!span) {
        x.min = undefined;
        x.max = undefined;
      } else {
        // Pin both ends to the data, as ApexCharts' range/auto-fit did: left unset, Chart.js rounds linear
        // bounds out to the next "nice" tick, leaving up to a tick step of empty axis past the latest point
        x.min = effectiveRange !== undefined ? span.maxX - effectiveRange : span.minX;
        x.max = span.maxX;
        if (x.min === x.max) {
          // A single point: give it a second of width (Chart.js would otherwise pad by 5% of the epoch value)
          x.min -= 500;
          x.max += 500;
        }
      }
    }

    // Multi-day historical ranges get per-day boundary annotations (the x ticks date each midnight).
    // Realtime ranges are bounded and never multi-day.
    const isMultiDay = !this.realTime() && !!span && span.spanMs > DAY_MS;
    options.plugins!.annotation!.annotations = isMultiDay ? buildDayBoundaryAnnotations(span!) : [];

    chart.update('none');
  }

  graphInfoCallback = (info: GraphInfo) => {
    // Skip processing if paused
    if (this.isPaused()) {
      return;
    }
    info.data.forEach((value, i) => {
      const seriesLabel = info.label + ' ' + i;
      if (!this.data.has(seriesLabel)) {
        this.data.set(seriesLabel, []);
      }
      const line = this.data.get(seriesLabel)!;

      value.forEach((val) => {
        const point = { x: val.x, y: Math.round(val.y * 10000) / 10000 };

        // if the point is in order according to it's timestamp, just push it to the end of the line
        if (line.length === 0 || val.x >= line.at(-1)!.x) {
          line.push(point);
        } else {
          // Out of order: binary search for correct sorted position
          // (very rare but it's nice to be able to assume sorted data for efficient trimming later)
          const idx = binarySearchInsertIndex(line, val.x);
          line.splice(idx, 0, point);
        }
      });

      // Trim after processing all points in this series batch
      if (this.realTime() && line.length > 0) {
        const config = this.graphConfig();
        const latestX = line[line.length - 1].x;

        if (config.rangeMode === 'time') {
          // remove point if outside the time range + 10% buffer (for better UX)
          const buffer = config.timeRangeMs * 0.1;
          const cutoff = latestX - config.timeRangeMs - buffer;
          if (line[0].x < cutoff) {
            line.shift();
          }
        } else if (line.length > config.maxPoints * 1.1) {
          const shiftedPoint = line.shift();
          // point based trim requires is to calculate the max time range we can show that
          // doesn't show points being deleted. So we default to smallest range.
          const timeDiff = shiftedPoint !== undefined ? latestX - shiftedPoint.x : 0;
          this.timeRangeMs = timeDiff < (this.timeRangeMs ?? Number.MAX_SAFE_INTEGER) ? timeDiff : this.timeRangeMs;
        }
      }
    });

    this.updateChart();
  };

  /** Drops any user zoom/pan and lets the chart follow the live window (or fit all data) again. */
  resetZoom(): void {
    // The zoom plugin fires onZoomComplete from resetZoom too, so clear the flag after it
    this.chart?.resetZoom('none');
    this.zoomed.set(false);
    this.updateChart();
  }

  resetRange() {
    this.timeRangeMs = undefined;
    this.resetZoom();
  }
}

import {
  Component,
  effect,
  input,
  OnDestroy,
  ChangeDetectionStrategy,
  untracked,
  inject,
  DestroyRef,
  ElementRef
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, takeUntil } from 'rxjs';
import * as echarts from 'echarts/core';
import type { ECharts } from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  DataZoomInsideComponent,
  GridComponent,
  LegendScrollComponent,
  MarkLineComponent,
  ToolboxComponent,
  TooltipComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import { binarySearchInsertIndex } from 'src/utils/array.utils';
import { GraphInfo, ObservableGraphInfo } from 'src/utils/types.utils';
import { baseGraphChartOption, GraphChartOption, graphChartUpdate, Point } from './graph-chart-options';

// Register only what this chart uses so the rest of ECharts tree-shakes out of the bundle
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendScrollComponent,
  DataZoomInsideComponent,
  ToolboxComponent,
  MarkLineComponent,
  CanvasRenderer
]);

@Component({
  selector: 'graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css'],
  standalone: true,
  imports: [NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class CustomGraphComponent implements OnDestroy {
  private destroyRef = inject(DestroyRef);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  /** Redraws on a resize, so the legend's width follows the chart's, even while paused. */
  private resizeObserver = new ResizeObserver(() => this.requestRender());
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

  /** Bound once to the echarts directive; changing it would make ngx-echarts rebuild the chart. */
  readonly baseOptions: GraphChartOption = baseGraphChartOption();
  chart: ECharts | undefined;
  // label -> [x, y] points (topic + value index), each kept sorted by x
  data = new Map<string, Point[]>();
  timeRangeMs: number | undefined = undefined;
  private frameId: number | undefined;
  /** Where the mouse rests over the chart, in chart pixels; undefined when it is elsewhere. */
  private hover: { x: number; y: number } | undefined;

  constructor() {
    this.resizeObserver.observe(this.host.nativeElement);
    effect(() => {
      if (this.isPaused()) {
        this.resetRange();
      }
    });
    effect(() => {
      this.graphConfig();
      this.resetRange();
    });
    effect(() => {
      this.realTime();
      this.clearGraph();
      this.valuesSubject();
      this.data = new Map();
      this.timeRangeMs = undefined;
      this.requestRender();
    });
    effect(() => {
      // Per-topic axes are rebuilt on every render, so a toggle only needs a redraw
      this.showMultipleYAxes();
      this.requestRender();
    });
    effect(() => {
      // End the subscriptions made for the previous topics
      this.valuesChange$.next();

      this.valuesSubject().forEach(({ label, updates }) => {
        updates
          .pipe(takeUntil(this.valuesChange$), takeUntilDestroyed(this.destroyRef))
          .subscribe((data) => this.graphInfoCallback({ label, data }));
      });

      this.updateChart();
    });
  }

  ngOnDestroy(): void {
    this.resizeObserver.disconnect();
    if (this.frameId !== undefined) {
      cancelAnimationFrame(this.frameId);
    }
    // ngx-echarts disposes the chart itself
    this.chart = undefined;
    this.data.clear();
  }

  onChartInit(chart: ECharts): void {
    this.chart = chart;
    chart.getZr().on('mousemove', (e) => {
      this.hover = { x: e.offsetX, y: e.offsetY };
    });
    chart.getZr().on('globalout', () => {
      this.hover = undefined;
    });
    // Deferred: ngx-echarts emits chartInit before applying [options] with notMerge, which would wipe a sync render
    this.requestRender();
  }

  /**
   * The toolbox's restore resets the chart to {@link baseOptions}, which has no series, so draw the data back.
   * Deferred like every redraw: setOption can't run inside the restore action ECharts is still processing.
   */
  onChartRestore(): void {
    this.requestRender();
  }

  /** Redraw for new data, unless a paused live graph should hold still. */
  updateChart = () => {
    untracked(() => {
      if (this.isPaused() && this.limitRange()) {
        return;
      }
      this.requestRender();
    });
  };

  /** Drop the live window so a paused graph shows everything it has buffered. */
  resetRange(): void {
    this.timeRangeMs = undefined;
    this.requestRender();
  }

  /**
   * Coalesce redraws to one per animation frame. Telemetry can arrive far faster than the
   * screen refreshes, and each setOption re-reads the series data.
   */
  private requestRender(): void {
    if (!this.chart || this.frameId !== undefined) return;
    this.frameId = requestAnimationFrame(() => {
      this.frameId = undefined;
      this.renderChart();
    });
  }

  /** Merge the current data into the chart; untracked so effects that trigger it don't subscribe to its reads. */
  renderChart(): void {
    untracked(() => {
      if (!this.chart || this.chart.isDisposed()) return;
      const config = this.graphConfig();
      // Only constrain the x-axis range in real-time mode; historical mode should auto-fit all data
      let xRangeMs: number | undefined = undefined;
      if (this.realTime() && !this.isPaused()) {
        xRangeMs = config.rangeMode === 'time' ? config.timeRangeMs : this.timeRangeMs;
      }
      const update = graphChartUpdate({
        data: this.data,
        multipleYAxes: this.showMultipleYAxes(),
        yMin: config.yMin,
        yMax: config.yMax,
        xRangeMs,
        detectMultiDay: !this.realTime(),
        // The host's, not chart.getWidth(): ngx-echarts resizes the chart up to 100 ms after the host resizes
        chartWidth: this.host.nativeElement.clientWidth
      });
      // Merges into the existing chart: series are matched by id and updated in place
      this.chart.setOption(update, { replaceMerge: ['series', 'yAxis'] });
      // After a redraw ECharts re-shows the tooltip for the time it last showed, which a live window has slid
      // away from under a still cursor; show it for the cursor's position instead
      if (this.hover) {
        this.chart.dispatchAction({ type: 'showTip', ...this.hover });
        // A redraw also rebuilds the toolbox and legend, dropping the hover state (such as an icon's title) of
        // whatever is under the cursor, and a still cursor sends no mousemove to restore it; re-enter it
        const { handler } = this.chart.getZr();
        const { x, y } = this.hover;
        // zrender reads only the position off the raw event
        const event = { zrX: x, zrY: y } as unknown as Parameters<typeof handler.dispatchToElement>[2];
        handler.dispatchToElement(handler.findHover(x, y), 'mouseover', event);
      }
    });
  }

  graphInfoCallback = (info: GraphInfo) => {
    // Skip processing if paused
    if (untracked(this.isPaused)) {
      return;
    }
    info.data.forEach((value, i) => {
      const seriesLabel = info.label + ' ' + i;
      if (!this.data.has(seriesLabel)) {
        this.data.set(seriesLabel, []);
      }
      const line = this.data.get(seriesLabel)!;

      value.forEach((val) => {
        const point: Point = [val.x, Math.round(val.y * 10000) / 10000];

        // if the point is in order according to it's timestamp, just push it to the end of the line
        if (line.length === 0 || val.x >= line[line.length - 1][0]) {
          line.push(point);
        } else {
          // Out of order: binary search for correct sorted position
          // (very rare but it's nice to be able to assume sorted data for efficient trimming later)
          const idx = binarySearchInsertIndex(line, val.x, (p) => p[0]);
          line.splice(idx, 0, point);
        }
      });

      // Trim after processing all points in this series batch
      if (untracked(this.realTime) && line.length > 0) {
        const config = untracked(this.graphConfig);
        const [latestX] = line[line.length - 1];

        if (config.rangeMode === 'time') {
          // Keep one point at or past the window's left edge, so the line runs off the edge instead of
          // stopping short of it (graphChartUpdate cuts the line at the edge); anything older is never drawn
          const windowStart = latestX - config.timeRangeMs;
          let offScreen = 0;
          while (offScreen + 1 < line.length && line[offScreen + 1][0] <= windowStart) offScreen++;
          if (offScreen > 0) line.splice(0, offScreen);
        } else if (line.length > config.maxPoints * 1.1) {
          const shiftedPoint = line.shift();
          // point based trim requires is to calculate the max time range we can show that
          // doesn't show points being deleted. So we default to smallest range.
          const timeDiff = shiftedPoint !== undefined ? latestX - shiftedPoint[0] : 0;
          this.timeRangeMs = timeDiff < (this.timeRangeMs ?? Number.MAX_SAFE_INTEGER) ? timeDiff : this.timeRangeMs;
        }
      }
    });

    this.updateChart();
  };
}

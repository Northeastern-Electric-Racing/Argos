import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  effect,
  inject,
  input,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, takeUntil } from 'rxjs';
import Dygraph, { dygraphs } from 'dygraphs';
import { binarySearchInsertIndex } from 'src/utils/array.utils';
import { GraphData, GraphInfo, ObservableGraphInfo } from 'src/utils/types.utils';
import {
  DAY_MS,
  DygraphRow,
  dayBoundaries,
  dayBoundaryLabel,
  hoverTimeLabel,
  multiDayLabel,
  seriesAxisOptions,
  singleDayLabel,
  toDygraphRows
} from './graph-chart.utils';

const DAY_BOUNDARY_COLOR = '#8fcadd';

type YRange = [number, number];

/** The configured Y Min/Max for dygraphs: null (fully automatic) when neither bound is set. */
const configuredYRange = (config: { yMin: number | null; yMax: number | null }): [number | null, number | null] | null =>
  config.yMin === null && config.yMax === null ? null : [config.yMin, config.yMax];

/**
 * The graph page's chart: a thin wrapper over dygraphs. Points are kept per series, merged into dygraphs' row
 * format, and drawn at most once per animation frame, however many datapoints arrive in between.
 */
@Component({
  selector: 'graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class CustomGraphComponent implements AfterViewInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  /** Emits when the topics change, ending the subscriptions made for the previous ones. */
  private valuesChange$ = new Subject<void>();
  private chartContainer = viewChild.required<ElementRef<HTMLDivElement>>('chartContainer');
  private legendContainer = viewChild.required<ElementRef<HTMLDivElement>>('legendContainer');
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

  chart: Dygraph | undefined;
  // label -> x,y (topic, data point), each kept sorted by x
  data = new Map<string, GraphData[]>();
  timeRangeMs: number | undefined = undefined;
  /** Set while the user is zoomed in; live updates then hold the x window until a double-click resets it. */
  private userZoomed = false;
  /** The x window render last applied for live data (null when it fits all data). */
  private appliedLiveWindow: [number, number] | null = null;
  /** The x window of the user's last x zoom, to tell a later vertical drag (x unchanged) from a new x zoom. */
  private zoomedXWindow: [number, number] | null = null;
  /**
   * The y ranges of the user's vertical drag, one per axis (null when none). dygraphs keeps them only internally
   * and drops them on the next updateOptions({ file }), so every render passes them back.
   */
  private userYRanges: YRange[] | null = null;
  /** The pointer's x on the chart (graph div px) and its series, to re-select that point after each redraw. */
  private hover: { domX: number; seriesName: string } | undefined;
  private dayBoundaryTimes: number[] = [];
  private frame: number | undefined;

  constructor() {
    effect(() => {
      if (this.isPaused()) {
        this.resetRange();
      }
    });
    effect(() => {
      const config = this.graphConfig();
      if (this.chart) {
        this.userYRanges = null;
        this.chart.updateOptions({ axes: this.yAxesOptions(config) });
        this.resetRange();
      }
    });

    effect(() => {
      this.realTime();
      this.clearGraph();
      this.valuesSubject();
      this.data = new Map();
      this.timeRangeMs = undefined;
      // A zoom window from the previous mode or topics would hide the new data.
      this.userZoomed = false;
      this.userYRanges = null;
      this.updateChart();
    });

    effect(() => {
      this.showMultipleYAxes();
      this.updateChart();
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

  ngAfterViewInit(): void {
    const config = this.graphConfig();
    this.chart = new Dygraph(this.chartContainer().nativeElement, [], {
      labels: ['Time'],
      labelsDiv: this.legendContainer().nativeElement,
      legend: 'always',
      connectSeparatedPoints: true,
      strokeWidth: 2,
      highlightSeriesOpts: { strokeWidth: 3, highlightCircleSize: 4 },
      highlightSeriesBackgroundAlpha: 1,
      animatedZooms: false,
      // As many decimals as the data keeps (graphInfoCallback rounds to 4); dygraphs' default is 2.
      digitsAfterDecimal: 4,
      resizable: 'passive',
      gridLineColor: 'rgba(255, 255, 255, 0.12)',
      axisLineColor: '#888',
      axes: {
        x: {
          ticker: Dygraph.dateTicker,
          axisLabelFormatter: singleDayLabel,
          valueFormatter: hoverTimeLabel,
          pixelsPerLabel: 100,
          // Wide enough for a multi-day label (M/D HH:MM) on one line; the default 60px wraps it.
          axisLabelWidth: 90
        },
        y: { valueRange: configuredYRange(config), axisLabelWidth: 60 },
        y2: { axisLabelWidth: 60 }
      },
      underlayCallback: this.drawDayBoundaries,
      zoomCallback: this.onZoom,
      highlightCallback: this.onHighlight,
      unhighlightCallback: this.onUnhighlight,
      drawCallback: this.onDraw
    });
    this.render();
  }

  ngOnDestroy(): void {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.chart?.destroy();
    this.chart = undefined;
    this.data.clear();
  }

  /** Schedules a redraw for the next animation frame, coalescing every update that arrives before it. */
  updateChart = () => {
    if (this.frame !== undefined) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      this.render();
    });
  };

  /** Draws the current data now. updateChart is the usual entry point; this is the frame it schedules. */
  render(): void {
    // Skip chart updates if paused
    if (!this.chart || (this.isPaused() && this.limitRange())) {
      return;
    }

    const labels = Array.from(this.data.keys());
    const rows = toDygraphRows(Array.from(this.data.values()));

    // Multi-day historical ranges get date-aware labels and per-day boundary lines.
    // Real-time ranges are bounded and never multi-day.
    const minX = rows.length > 0 ? rows[0][0] : 0;
    const maxX = rows.length > 0 ? rows[rows.length - 1][0] : 0;
    const isMultiDay = !this.realTime() && maxX - minX > DAY_MS;
    this.dayBoundaryTimes = isMultiDay ? dayBoundaries(minX, maxX) : [];

    const options: dygraphs.Options = {
      file: rows,
      labels: ['Time', ...labels],
      ...seriesAxisOptions(labels, this.showMultipleYAxes()),
      axes: {
        x: { axisLabelFormatter: isMultiDay ? multiDayLabel : singleDayLabel },
        ...this.yAxesOptions(this.graphConfig())
      }
    };
    if (!this.userZoomed) {
      options.dateWindow = this.appliedLiveWindow = this.liveWindow(rows);
    }
    this.chart.updateOptions(options);
  }

  /**
   * The y and y2 value ranges: the user's vertical-drag zoom while there is one, else the configured Y Min/Max.
   * dygraphs would otherwise lose a drag's y range on the next redraw.
   */
  private yAxesOptions(config: { yMin: number | null; yMax: number | null }): dygraphs.Options['axes'] {
    const user = this.userYRanges;
    return {
      y: { valueRange: user ? user[0] : configuredYRange(config) },
      y2: { valueRange: user?.[1] ?? null }
    };
  }

  private onZoom = (minX: number, maxX: number, yRanges: ReadonlyArray<[number, number]>) => {
    const { chart } = this;
    if (!chart) return;
    if (!chart.isZoomed()) {
      // A double-click (resetZoom) clears the x window and also drops the configured y range,
      // so redraw to put both back.
      this.userZoomed = false;
      this.userYRanges = null;
      this.updateChart();
      return;
    }
    // A vertical drag zooms y only and reports the x window it started from: the live window in real time, the
    // user's x zoom while one is held, or none in historical mode. Keep its y ranges (dygraphs drops them on the
    // next redraw) and keep following live data, rather than freeze as if the user had zoomed in on x.
    const before = this.userZoomed ? this.zoomedXWindow : this.appliedLiveWindow;
    const xUnchanged = before ? before[0] === minX && before[1] === maxX : !chart.isZoomed('x');
    if (xUnchanged) {
      this.userYRanges = yRanges.map(([low, high]): YRange => [low, high]);
      return;
    }
    this.userZoomed = chart.isZoomed('x');
    this.zoomedXWindow = [minX, maxX];
  };

  private onHighlight = (event: MouseEvent, _x: number, _points: unknown, _row: number, seriesName: string) => {
    if (!this.chart) return;
    this.hover = { domX: this.chart.eventToDomCoords(event)[0], seriesName };
  };

  private onUnhighlight = () => {
    this.hover = undefined;
  };

  /**
   * Every redraw resets dygraphs' selection, which blanks the hover legend. While the pointer is over the chart,
   * select the row nearest it again, so the legend keeps showing the hovered values through live updates.
   */
  private onDraw = (g: Readonly<Dygraph>) => {
    const rows = g.numRows();
    if (!this.hover || rows === 0) return;
    const x = g.toDataXCoord(this.hover.domX);
    const rowX = (row: number) => g.getValue(row, 0)!;
    // Binary search for the first row at or after x, then take whichever neighbour is closer.
    let lo = 0;
    let hi = rows - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (rowX(mid) < x) lo = mid + 1;
      else hi = mid;
    }
    const row = lo > 0 && x - rowX(lo - 1) < rowX(lo) - x ? lo - 1 : lo;
    g.setSelection(row, this.hover.seriesName);
  };

  /** Only real-time mode constrains the x window; historical mode fits all data (null). */
  private liveWindow(rows: DygraphRow[]): [number, number] | null {
    if (!this.realTime() || rows.length === 0) return null;
    const config = this.graphConfig();
    const range = config.rangeMode === 'time' ? config.timeRangeMs : this.timeRangeMs;
    if (range === undefined) return null;
    const [latestX] = rows[rows.length - 1];
    return [latestX - range, latestX];
  }

  private drawDayBoundaries = (ctx: CanvasRenderingContext2D, area: Readonly<dygraphs.Area>, g: Readonly<Dygraph>) => {
    if (this.dayBoundaryTimes.length === 0) return;
    ctx.save();
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (const t of this.dayBoundaryTimes) {
      const x = g.toDomXCoord(t);
      if (x < area.x || x > area.x + area.w) continue;

      ctx.strokeStyle = DAY_BOUNDARY_COLOR;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, area.y);
      ctx.lineTo(x, area.y + area.h);
      ctx.stroke();

      const text = dayBoundaryLabel(t);
      const width = ctx.measureText(text).width + 8;
      ctx.setLineDash([]);
      ctx.fillStyle = '#0c2026';
      ctx.fillRect(x - width / 2, area.y, width, 16);
      ctx.strokeRect(x - width / 2, area.y, width, 16);
      ctx.fillStyle = '#fff';
      ctx.fillText(text, x, area.y + 2);
    }
    ctx.restore();
  };

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
          // (very rare, but the row merge and trimming below rely on sorted data)
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

  resetRange() {
    this.timeRangeMs = undefined;
    this.userZoomed = false;
    this.chart?.updateOptions({ dateWindow: null });
    this.updateChart();
  }
}

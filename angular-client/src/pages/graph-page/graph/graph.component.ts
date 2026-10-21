import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  afterRenderEffect,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AutoscaleInfo,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
  LineSeries,
  MouseEventParams,
  Time,
  createChart
} from 'lightweight-charts';
import { Subject, takeUntil } from 'rxjs';
import { binarySearchInsertIndex } from 'src/utils/array.utils';
import { GraphData, GraphInfo, ObservableGraphInfo } from 'src/utils/types.utils';
import { DayBoundariesPrimitive } from './day-boundaries.primitive';
import { HoverMarker, HoverMarkersPrimitive } from './hover-markers.primitive';
import {
  buildDayBoundaries,
  formatCrosshairTime,
  formatTickMark,
  formatValue,
  fromChartTime,
  priceScaleIdFor,
  seriesColor,
  toChartTime,
  toLineData
} from './graph-chart.utils';

export interface GraphConfig {
  maxPoints: number;
  yMin: number | null;
  yMax: number | null;
  rangeMode: 'time' | 'points';
  timeRangeMs: number;
}

export interface LegendItem {
  label: string;
  color: string;
}

export interface TooltipRow extends LegendItem {
  /** The series' value at or before the hovered time. */
  value: string;
}

export interface HoverState {
  time: string;
  rows: TooltipRow[];
  /** Cursor position in px from the chart's top-left corner (left of its left price axis). */
  x: number;
  y: number;
}

/** Gap between the cursor and the tooltip, in px. */
const TOOLTIP_OFFSET = 12;

/**
 * Points trimmed off a series' head stay drawn (off-screen, left of the live window) until this many
 * pile up, so live updates stay O(1) appends instead of a full setData on every trim.
 */
const MIN_STALE_HEAD = 50;
const STALE_HEAD_FRACTION = 0.1;

/** Smallest bar spacing (px) the time scale allows, so fitContent() fits about 1000 bars per pixel. */
const MIN_BAR_SPACING = 0.001;

@Component({
  selector: 'graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class CustomGraphComponent implements OnInit, OnDestroy {
  private destroyRef = inject(DestroyRef);
  /** Emits when the topics change, ending the subscriptions made for the previous ones. */
  private valuesChange$ = new Subject<void>();
  private container = viewChild.required<ElementRef<HTMLDivElement>>('chartContainer');
  private tooltip = viewChild<ElementRef<HTMLDivElement>>('tooltip');

  showMultipleYAxes = input<boolean>(false);
  valuesSubject = input.required<ObservableGraphInfo[]>();
  limitRange = input(true);
  isPaused = input<boolean>(false);
  realTime = input<boolean>(false);
  clearGraph = input<number>(0);
  graphConfig = input.required<GraphConfig>();
  range = input<number | undefined>(undefined);

  chart: IChartApi | undefined;
  // label -> x,y (topic, data point), each sorted by x
  data = new Map<string, GraphData[]>();
  timeRangeMs: number | undefined = undefined;

  readonly legend = signal<LegendItem[]>([]);
  readonly hover = signal<HoverState | null>(null);

  private series = new Map<string, ISeriesApi<'Line'>>();
  /** Points per series that were trimmed from `data` but are still in the chart's copy. */
  private staleHead = new Map<string, number>();
  private dayBoundaries = new DayBoundariesPrimitive();
  private hoverMarkers = new HoverMarkersPrimitive();
  private multiDay = false;

  constructor() {
    // Beside the cursor, flipped to its other side where it would overflow the chart's right or bottom edge.
    afterRenderEffect({
      earlyRead: () => {
        const hover = this.hover();
        const tooltip = this.tooltip()?.nativeElement;
        if (!hover || !tooltip) return null;
        const area = this.container().nativeElement;
        const { x, y } = hover;
        const { offsetWidth: width, offsetHeight: height } = tooltip;
        // The page can push the chart's bottom off screen, so flip against the visible part of it.
        const bottom = Math.min(area.clientHeight, window.innerHeight - area.getBoundingClientRect().top);
        const flipX = x + TOOLTIP_OFFSET + width > area.clientWidth;
        const flipY = y + TOOLTIP_OFFSET + height > bottom;
        return {
          tooltip,
          left: flipX ? Math.max(0, x - TOOLTIP_OFFSET - width) : x + TOOLTIP_OFFSET,
          top: flipY ? Math.max(0, y - TOOLTIP_OFFSET - height) : y + TOOLTIP_OFFSET
        };
      },
      write: (position) => {
        const placed = position();
        if (!placed) return;
        placed.tooltip.style.transform = `translate(${placed.left}px, ${placed.top}px)`;
        placed.tooltip.style.visibility = 'visible';
      }
    });

    effect(() => {
      if (this.isPaused()) {
        untracked(() => this.resetRange());
      }
    });

    effect(() => {
      this.graphConfig();
      untracked(() => {
        // y min/max are read by each series' autoscaleInfoProvider; ask the scales to re-run it.
        this.series.forEach((s) => s.priceScale().applyOptions({ autoScale: true }));
        this.applyYScaleMargins();
        this.resetRange();
      });
    });

    effect(() => {
      this.realTime();
      this.clearGraph();
      this.valuesSubject();
      untracked(() => this.clearChart());
    });

    effect(() => {
      this.showMultipleYAxes();
      // Series can't move between price scales in place, so rebuild them on the new layout.
      untracked(() => this.rebuildSeries());
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
      });
    });
  }

  ngOnInit(): void {
    this.chart = createChart(this.container().nativeElement, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#fff',
        fontSize: 12
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.08)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.08)' }
      },
      crosshair: { mode: CrosshairMode.Normal },
      // The library's time-axis double-click reset restores its default zoom, not the whole range;
      // resetZoom() handles double-clicks instead.
      handleScale: { axisDoubleClickReset: { time: false, price: true } },
      leftPriceScale: { visible: true, borderVisible: false },
      rightPriceScale: { visible: false, borderVisible: false },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderVisible: false,
        // Labels run to `HH:MM:SS.mmm`; the default spacing assumes 8 characters, so they overlapped.
        tickMarkMaxCharacterLength: 12,
        // The default 0.5 px minimum lets fitContent() show only (width * 2) bars, so a long run
        // (a 50-hour run at 30 s is 6000 bars) showed just its last hours. Allow far denser bars.
        minBarSpacing: MIN_BAR_SPACING,
        tickMarkFormatter: (time: Time) => formatTickMark(time, this.multiDay)
      },
      localization: {
        timeFormatter: formatCrosshairTime,
        priceFormatter: formatValue
      }
    });
    this.chart.panes()[0].attachPrimitive(this.dayBoundaries);
    this.chart.panes()[0].attachPrimitive(this.hoverMarkers);
    this.chart.subscribeCrosshairMove(this.onCrosshairMove);
    this.rebuildSeries();
  }

  ngOnDestroy(): void {
    this.chart?.unsubscribeCrosshairMove(this.onCrosshairMove);
    this.chart?.remove();
    this.chart = undefined;
    this.series.clear();
    this.data.clear();
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
      // A first batch (e.g. a historical query) or an out-of-order point is handed over whole;
      // in-order live points are appended one by one.
      let rebuild = line.length === 0;
      const appended: GraphData[] = [];

      value.forEach((val) => {
        const point = { x: val.x, y: Math.round(val.y * 10000) / 10000 };

        // if the point is in order according to it's timestamp, just push it to the end of the line
        if (line.length === 0 || val.x >= line.at(-1)!.x) {
          line.push(point);
          appended.push(point);
        } else {
          // Out of order: binary search for correct sorted position
          // (very rare but it's nice to be able to assume sorted data for efficient trimming later)
          const idx = binarySearchInsertIndex(line, val.x);
          line.splice(idx, 0, point);
          rebuild = true;
        }
      });

      let trimmed = 0;
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
            trimmed++;
          }
        } else if (line.length > config.maxPoints * 1.1) {
          const shiftedPoint = line.shift();
          trimmed++;
          // point based trim requires is to calculate the max time range we can show that
          // doesn't show points being deleted. So we default to smallest range.
          const timeDiff = shiftedPoint !== undefined ? latestX - shiftedPoint.x : 0;
          this.timeRangeMs = timeDiff < (this.timeRangeMs ?? Number.MAX_SAFE_INTEGER) ? timeDiff : this.timeRangeMs;
        }
      }

      this.syncSeries(seriesLabel, line, appended, rebuild, trimmed);
    });

    this.refreshView();
  };

  resetRange() {
    this.timeRangeMs = undefined;
    this.chart?.timeScale().fitContent();
  }

  /** Double-click: back to the whole range on both axes (stands in for ApexCharts' reset-zoom button). */
  resetZoom() {
    this.chart?.timeScale().fitContent();
    this.series.forEach((s) => s.priceScale().applyOptions({ autoScale: true }));
  }

  /** Pushes one series' changes to the chart: appends when possible, a full setData otherwise. */
  private syncSeries(label: string, line: GraphData[], appended: GraphData[], rebuild: boolean, trimmed: number) {
    if (!this.chart) return;
    let series = this.series.get(label);
    if (!series) {
      series = this.addSeries(label);
      rebuild = true;
    }

    const stale = (this.staleHead.get(label) ?? 0) + trimmed;
    if (rebuild || stale > Math.max(MIN_STALE_HEAD, line.length * STALE_HEAD_FRACTION)) {
      series.setData(toLineData(line));
      this.staleHead.set(label, 0);
      return;
    }
    for (const point of appended) {
      series.update({ time: toChartTime(point.x), value: point.y });
    }
    this.staleHead.set(label, stale);
  }

  private addSeries(label: string): ISeriesApi<'Line'> {
    const index = this.series.size;
    const color = seriesColor(index);
    const multipleYAxes = untracked(this.showMultipleYAxes);
    const priceScaleId = priceScaleIdFor(index, multipleYAxes);
    // An overlay scale draws no axis, so its last-value label (and title) would land beside another
    // topic's ticks on the left or right axis; those topics show their values only in the tooltip.
    const ownAxis = priceScaleId === 'left' || priceScaleId === 'right';
    const series = this.chart!.addSeries(LineSeries, {
      color,
      lineWidth: 3,
      priceScaleId,
      // With an axis per topic, tag each axis' last-value label with its topic.
      title: multipleYAxes && ownAxis ? label : '',
      lastValueVisible: ownAxis,
      priceLineVisible: false,
      // hoverMarkers marks every series at its held value instead.
      crosshairMarkerVisible: false,
      priceFormat: { type: 'custom', formatter: formatValue, minMove: 0.0001 },
      autoscaleInfoProvider: (original: () => AutoscaleInfo | null) => this.applyYLimits(original(), multipleYAxes)
    });
    this.series.set(label, series);
    this.legend.update((items) => [...items, { label, color }]);
    return series;
  }

  /** Fixed y min/max from the graph config, on the shared axis only (as before). */
  private applyYLimits(info: AutoscaleInfo | null, multipleYAxes: boolean): AutoscaleInfo | null {
    const { yMin, yMax } = untracked(this.graphConfig);
    if (multipleYAxes || !info?.priceRange || (yMin === null && yMax === null)) return info;
    return {
      ...info,
      priceRange: {
        minValue: yMin ?? info.priceRange.minValue,
        maxValue: yMax ?? info.priceRange.maxValue
      }
    };
  }

  /** A fixed y min/max is the shared axis' exact edge, so drop the scale's default padding on that side. */
  private applyYScaleMargins() {
    if (!this.chart) return;
    const { yMin, yMax } = untracked(this.graphConfig);
    const pinned = !untracked(this.showMultipleYAxes);
    this.chart.priceScale('left').applyOptions({
      scaleMargins: { top: pinned && yMax !== null ? 0 : 0.2, bottom: pinned && yMin !== null ? 0 : 0.1 }
    });
  }

  private removeAllSeries() {
    this.series.forEach((s) => this.chart?.removeSeries(s));
    this.series.clear();
    this.staleHead.clear();
    this.legend.set([]);
    this.hover.set(null);
    this.hoverMarkers.setMarkers([]);
  }

  private clearChart() {
    this.removeAllSeries();
    this.data = new Map();
    this.timeRangeMs = undefined;
    this.dayBoundaries.setBoundaries([]);
  }

  /** Recreates every series from `data` (first render, or the y-axis layout changed). */
  private rebuildSeries() {
    if (!this.chart) return;
    this.removeAllSeries();
    const multipleYAxes = untracked(this.showMultipleYAxes);
    this.chart.applyOptions({ rightPriceScale: { visible: multipleYAxes && this.data.size > 1 } });
    this.applyYScaleMargins();
    this.data.forEach((line, label) => this.syncSeries(label, line, [], true, 0));
    this.refreshView();
  }

  /** Visible time window: the live window in real time, everything (plus day boundaries) otherwise. */
  private refreshView() {
    if (!this.chart) return;
    // While paused the user can scroll and zoom freely
    if (untracked(this.isPaused) && untracked(this.limitRange)) return;

    if (untracked(this.showMultipleYAxes)) {
      this.chart.applyOptions({ rightPriceScale: { visible: this.series.size > 1 } });
    }

    const timeScale = this.chart.timeScale();
    if (untracked(this.realTime)) {
      this.setMultiDay(false);
      const config = untracked(this.graphConfig);
      const range = config.rangeMode === 'time' ? config.timeRangeMs : this.timeRangeMs;
      let latest = -Infinity;
      this.data.forEach((line) => {
        if (line.length > 0) latest = Math.max(latest, line[line.length - 1].x);
      });
      if (range !== undefined && isFinite(latest)) {
        timeScale.setVisibleRange({ from: toChartTime(latest - range), to: toChartTime(latest) });
      } else {
        timeScale.fitContent();
      }
      return;
    }

    const boundaries = buildDayBoundaries(Array.from(this.data.values()));
    this.setMultiDay(boundaries.length > 0);
    this.dayBoundaries.setBoundaries(boundaries);
    timeScale.fitContent();
  }

  private setMultiDay(multiDay: boolean) {
    if (multiDay === this.multiDay) return;
    this.multiDay = multiDay;
    // A new formatter function makes the time scale drop its cached labels.
    this.chart?.applyOptions({ timeScale: { tickMarkFormatter: (time: Time) => formatTickMark(time, this.multiDay) } });
  }

  private onCrosshairMove = (param: MouseEventParams<Time>) => {
    if (param.time === undefined || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
      this.hover.set(null);
      this.hoverMarkers.setMarkers([]);
      return;
    }
    // Hold each series' latest value at the hovered time, since topics rarely share timestamps.
    const timeMs = fromChartTime(param.time);
    const rows: TooltipRow[] = [];
    const markers: HoverMarker[] = [];
    for (const item of this.legend()) {
      const line = this.data.get(item.label) ?? [];
      const series = this.series.get(item.label);
      let idx = binarySearchInsertIndex(line, timeMs);
      if (line[idx]?.x !== timeMs) idx--;
      if (idx < 0 || !series) continue;
      const { x, y } = line[idx];
      rows.push({ ...item, value: formatValue(y) });
      markers.push({ series, timeMs: x, value: y, color: item.color });
    }
    this.hoverMarkers.setMarkers(markers);
    // The chart reports the cursor relative to the pane, which starts right of the left price axis.
    const paneLeft = this.chart?.priceScale('left').width() ?? 0;
    this.hover.set({ time: formatCrosshairTime(param.time), rows, x: paneLeft + param.point.x, y: param.point.y });
  };
}

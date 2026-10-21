import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, takeUntil } from 'rxjs';
import { binarySearchInsertIndex } from 'src/utils/array.utils';
import { GraphData, GraphInfo, ObservableGraphInfo } from 'src/utils/types.utils';
import { DrawSeries, GraphRenderer, OverlayMarks } from './graph-renderer';
import { computeView, formatTooltipTime, hoverPoint, pixelMapping, plotArea, Range, Rect, View } from './graph-scale';

// ApexCharts' default palette, so series keep the colours people are used to.
const PALETTE = [
  '#008FFB',
  '#00E396',
  '#FEB019',
  '#FF4560',
  '#775DD0',
  '#3F51B5',
  '#26A69A',
  '#D4526E',
  '#F86624',
  '#A5978B'
];
const DRAG_THRESHOLD_PX = 5;
const WHEEL_ZOOM = 1.25;
/** How far past a series' first or last point the cursor can be and still show its value. */
const HOVER_TOLERANCE_PX = 12;

export interface LegendEntry {
  name: string;
  color: string;
}

export interface HoverInfo {
  left: number;
  top: number;
  /** Show the tooltip left of the cursor, near the right edge. */
  flip: boolean;
  time: string;
  rows: { name: string; color: string; value: number }[];
}

@Component({
  selector: 'graph',
  templateUrl: './graph.component.html',
  styleUrls: ['./graph.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class CustomGraphComponent {
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

  // label -> x,y (topic, data point), kept sorted by x
  data = new Map<string, GraphData[]>();
  timeRangeMs: number | undefined = undefined;

  readonly legend = signal<LegendEntry[]>([]);
  readonly hidden = signal<ReadonlySet<string>>(new Set());
  readonly hover = signal<HoverInfo | null>(null);
  readonly zoom = signal<Range | null>(null);
  readonly renderError = signal<string | null>(null);

  private container = viewChild.required<ElementRef<HTMLDivElement>>('chartContainer');
  private glCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('glCanvas');
  private overlayCanvas = viewChild.required<ElementRef<HTMLCanvasElement>>('overlayCanvas');

  private renderer?: GraphRenderer;
  /** Removes the WebGL context-loss listeners. */
  private glListeners?: AbortController;
  private resizeObserver?: ResizeObserver;
  private size = { width: 0, height: 0 };
  private frame?: number;
  private dataDirty = true;
  private cursor: { x: number; y: number } | null = null;
  private dragStart: number | null = null;
  private lastView: View | null = null;
  private lastArea: Rect | null = null;

  constructor() {
    effect(() => {
      if (this.isPaused()) {
        this.resetRange();
      }
    });
    effect(() => {
      this.graphConfig();
      this.showMultipleYAxes();
      this.resetRange();
    });

    effect(() => {
      this.realTime();
      this.clearGraph();
      this.valuesSubject();
      this.data = new Map();
      this.timeRangeMs = undefined;
      this.zoom.set(null);
      this.hidden.set(new Set());
      untracked(() => this.markDataChanged());
    });

    effect(() => {
      // End the subscriptions made for the previous topics
      this.valuesChange$.next();

      const values = this.valuesSubject();
      // untracked: BehaviorSubjects replay synchronously, and the callback's signal reads
      // (isPaused, graphConfig...) must not make this effect resubscribe when they change
      untracked(() =>
        values.forEach(({ label, updates }) => {
          updates
            .pipe(takeUntil(this.valuesChange$), takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => this.graphInfoCallback({ label, data }));
        })
      );
    });

    afterNextRender(() => this.setupRenderer());
    this.destroyRef.onDestroy(() => this.teardown());
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

    this.markDataChanged();
  };

  resetRange() {
    this.timeRangeMs = undefined;
    this.requestFrame();
  }

  resetZoom() {
    this.zoom.set(null);
    this.requestFrame();
  }

  toggleSeries(name: string) {
    this.hidden.update((hidden) => {
      const next = new Set(hidden);
      if (!next.delete(name)) next.add(name);
      return next;
    });
    this.requestFrame();
  }

  onPointerMove(event: PointerEvent) {
    this.cursor = this.localPoint(event);
    this.requestFrame();
  }

  onPointerLeave() {
    this.cursor = null;
    this.hover.set(null);
    this.requestFrame();
  }

  onPointerDown(event: PointerEvent) {
    const p = this.localPoint(event);
    if (event.button !== 0 || !this.inPlot(p)) return;
    this.dragStart = p.x;
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
  }

  /** Drag across the plot to zoom into that time range. */
  onPointerUp(event: PointerEvent) {
    const start = this.dragStart;
    this.dragStart = null;
    const end = this.localPoint(event).x;
    if (start !== null && this.lastView && this.lastArea && Math.abs(end - start) > DRAG_THRESHOLD_PX) {
      const { pxToX } = pixelMapping(this.lastView, this.lastArea);
      this.zoom.set({ min: pxToX(Math.min(start, end)), max: pxToX(Math.max(start, end)) });
    }
    this.requestFrame();
  }

  /** Wheel to zoom the time axis around the cursor. */
  onWheel(event: WheelEvent) {
    const p = this.localPoint(event);
    if (!this.lastView || !this.lastArea || !this.inPlot(p)) return;
    event.preventDefault();
    const { x } = this.lastView;
    const anchor = pixelMapping(this.lastView, this.lastArea).pxToX(p.x);
    const factor = event.deltaY > 0 ? WHEEL_ZOOM : 1 / WHEEL_ZOOM;
    this.zoom.set({ min: anchor - (anchor - x.min) * factor, max: anchor + (x.max - anchor) * factor });
    this.requestFrame();
  }

  /** Current series in data-map order, with their colours and visibility. */
  private drawSeries(): DrawSeries[] {
    const hidden = this.hidden();
    return Array.from(this.data, ([name, points], i) => ({
      name,
      points,
      color: PALETTE[i % PALETTE.length],
      visible: !hidden.has(name)
    }));
  }

  private markDataChanged() {
    this.dataDirty = true;
    this.syncLegend();
    // Skip chart updates if paused (live mode); the last frame stays on screen
    if (this.isPaused() && this.limitRange()) return;
    this.requestFrame();
  }

  /** Coalesce every update in a frame into one draw: data can arrive far faster than 60 Hz. */
  private requestFrame() {
    if (this.frame !== undefined || !this.renderer) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = undefined;
      this.renderFrame();
    });
  }

  private renderFrame() {
    if (!this.renderer) return;
    const series = this.drawSeries();
    if (this.dataDirty) {
      this.renderer.upload(series);
      this.dataDirty = false;
    }

    const config = this.graphConfig();
    const realTime = this.realTime();
    const multiAxis = this.showMultipleYAxes();
    // Only constrain the x-axis range in real-time mode; historical mode auto-fits all data
    const view = computeView({
      series,
      multiAxis,
      realTime,
      windowMs: realTime ? (config.rangeMode === 'time' ? config.timeRangeMs : this.timeRangeMs) : undefined,
      zoom: this.zoom(),
      yOverride: { min: config.yMin, max: config.yMax }
    });
    const area = plotArea(this.size.width, this.size.height, view?.axes.length ?? 1);
    this.lastView = view;
    this.lastArea = area;

    const marks: OverlayMarks = {};
    if (view && this.cursor && this.inPlot(this.cursor)) {
      marks.crosshairX = this.cursor.x;
      marks.dots = this.updateHover(series, view, area);
      if (this.dragStart !== null) marks.selection = { from: this.dragStart, to: this.cursor.x };
    } else if (this.hover()) {
      this.hover.set(null);
    }
    this.renderer.draw(series, view, area, marks);
  }

  /** Tooltip values at the cursor's time, one row per visible series. Returns the hover dots. */
  private updateHover(series: DrawSeries[], view: View, area: Rect): OverlayMarks['dots'] {
    const cursor = this.cursor!;
    const { pxToX, xToPx, yToPx } = pixelMapping(view, area);
    const x = pxToX(cursor.x);
    const tolerance = pxToX(cursor.x + HOVER_TOLERANCE_PX) - x;
    const rows: HoverInfo['rows'] = [];
    const dots: NonNullable<OverlayMarks['dots']> = [];
    series.forEach((s, i) => {
      const point = s.visible ? hoverPoint(s.points, x, tolerance) : undefined;
      if (!point) return;
      rows.push({ name: s.name, color: s.color, value: point.y });
      dots.push({ x: xToPx(point.x), y: yToPx(point.y, view.axes[view.seriesAxis[i]]), color: s.color });
    });
    this.hover.set(
      rows.length === 0
        ? null
        : {
            left: cursor.x,
            top: cursor.y,
            flip: cursor.x > area.left + area.width / 2,
            time: formatTooltipTime(x),
            rows
          }
    );
    return dots;
  }

  /** Keep the legend matched to the series set; a no-op while only points change. */
  private syncLegend() {
    const names = Array.from(this.data.keys());
    const current = this.legend();
    if (current.length === names.length && current.every((entry, i) => entry.name === names[i])) return;
    this.legend.set(names.map((name, i) => ({ name, color: PALETTE[i % PALETTE.length] })));
  }

  private localPoint(event: MouseEvent): { x: number; y: number } {
    const rect = this.container().nativeElement.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  private inPlot(p: { x: number; y: number }): boolean {
    const a = this.lastArea;
    return !!a && p.x >= a.left && p.x <= a.left + a.width && p.y >= a.top && p.y <= a.top + a.height;
  }

  private setupRenderer() {
    if (!this.createRenderer()) return;
    this.watchContextLoss();
    const container = this.container().nativeElement;
    this.resizeObserver = new ResizeObserver(([entry]) => {
      this.size = { width: entry.contentRect.width, height: entry.contentRect.height };
      this.renderer?.resize(this.size.width, this.size.height, window.devicePixelRatio || 1);
      // Resizing a canvas clears it, so redraw right away rather than next frame
      this.renderFrame();
    });
    this.resizeObserver.observe(container);
    this.requestFrame();
  }

  /** Returns false, and shows the fallback message, when WebGL2 is unavailable. */
  private createRenderer(): boolean {
    try {
      this.renderer = new GraphRenderer(this.glCanvas().nativeElement, this.overlayCanvas().nativeElement);
      return true;
    } catch (e) {
      this.renderError.set(`The graph needs WebGL2, which this browser can't provide (${(e as Error).message}).`);
      return false;
    }
  }

  /**
   * The browser can drop the WebGL context at any time (GPU reset, driver update, sleep, too many
   * contexts). Without preventDefault it never gives it back and the plot stays blank, so take
   * the loss, and rebuild the renderer (its programs and buffers die with the old context) once
   * the context is restored.
   */
  private watchContextLoss() {
    const canvas = this.glCanvas().nativeElement;
    this.glListeners = new AbortController();
    const { signal } = this.glListeners;
    canvas.addEventListener(
      'webglcontextlost',
      (event) => {
        event.preventDefault();
        if (this.frame !== undefined) cancelAnimationFrame(this.frame);
        this.frame = undefined;
        this.renderer = undefined;
      },
      { signal }
    );
    canvas.addEventListener(
      'webglcontextrestored',
      () => {
        if (!this.createRenderer()) return;
        this.renderer!.resize(this.size.width, this.size.height, window.devicePixelRatio || 1);
        this.dataDirty = true;
        this.requestFrame();
      },
      { signal }
    );
  }

  private teardown() {
    this.glListeners?.abort();
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.renderer?.destroy();
    this.renderer = undefined;
    this.data.clear();
  }
}

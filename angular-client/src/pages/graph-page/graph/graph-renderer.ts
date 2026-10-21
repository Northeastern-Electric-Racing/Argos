import { WebglLinePlot } from 'webgl-plot';
import { GraphData } from 'src/utils/types.utils';
import {
  AXIS_WIDTH,
  axisSlots,
  dayBoundaries,
  formatDayLabel,
  formatTick,
  niceTicks,
  pixelMapping,
  Rect,
  timeAxis,
  View
} from './graph-scale';

export interface DrawSeries {
  name: string;
  /** `#rrggbb` */
  color: string;
  points: GraphData[];
  visible: boolean;
}

/** Overlay extras drawn on top of the axes: hover crosshair and the drag-to-zoom selection. */
export interface OverlayMarks {
  crosshairX?: number;
  dots?: { x: number; y: number; color: string }[];
  selection?: { from: number; to: number };
}

const AXIS_TEXT = '#fff';
const GRID = 'rgba(255, 255, 255, 0.1)';
const DAY_LINE = '#8fcadd';
/** How far multi-axis tick labels are mixed toward white, for at least 4.5:1 contrast on the dark page. */
const LABEL_LIGHTEN = 0.35;
/**
 * How many view widths the view may drift from `origin` before x is re-uploaded relative to
 * the view. Float32 holds about 7 digits, so this keeps a visible point's position exact to
 * well under a pixel however far into a long range the view is zoomed.
 */
const REBASE_SPANS = 100;
/** Smallest per-line buffer, in points, so a new series doesn't re-create the buffers every point. */
const MIN_ROOM = 64;

const hexToRgba = (hex: string): [number, number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
};

/** `hex` mixed `amount` (0..1) of the way to white, as a CSS colour. */
export const lighten = (hex: string, amount: number): string => {
  const [r, g, b] = hexToRgba(hex).map((c) => Math.round((c + (1 - c) * amount) * 255));
  return `rgb(${r}, ${g}, ${b})`;
};

/**
 * Draws the graph page's chart: webgl-plot for the lines, and a transparent 2D canvas on
 * top for everything webgl-plot leaves out (grid, axes, tick labels, day boundaries, hover marks).
 */
export class GraphRenderer {
  private readonly gl: WebGL2RenderingContext;
  private readonly ctx: CanvasRenderingContext2D;
  private lines: WebglLinePlot;
  private capacity = 16;
  /** x values are uploaded relative to this, since Float32 can't hold epoch ms precisely. */
  private origin = 0;
  private width = 0;
  private height = 0;
  private dpr = 1;
  /** The page's font (Roboto), so canvas text matches the HTML legend and tooltip. */
  private readonly font: string;
  /** Each series' x,y points, in a power-of-two buffer padded with its last point. */
  private buffers: Float32Array[] = [];
  /** The series the GPU buffers are laid out for, by name. */
  private names: string[] = [];

  constructor(
    private readonly glCanvas: HTMLCanvasElement,
    private readonly overlayCanvas: HTMLCanvasElement
  ) {
    // Not webgl-plot's createWebGL2Context: it can't turn off the depth buffer, and its default
    // multisampling (antialias) holds several samples per pixel. 1px lines need neither, and
    // together they were most of the drawing buffer's GPU memory. Throws when WebGL2 is
    // unavailable; the component shows a fallback message.
    const gl = glCanvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) throw new Error('WebGL2 is not supported or context creation failed');
    this.gl = gl;
    this.gl.clearColor(0, 0, 0, 0);
    this.lines = new WebglLinePlot(this.gl, this.capacity);
    const ctx = overlayCanvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
    this.font = `12px ${getComputedStyle(overlayCanvas).fontFamily || 'sans-serif'}`;
  }

  /**
   * Match both canvases to the container's CSS size at device resolution.
   * @param devicePx the exact device-pixel size, when the browser reports it. It is only used
   * when it agrees with `dpr`: Chrome's device emulation keeps reporting the old ratio's size.
   */
  resize(width: number, height: number, dpr: number, devicePx?: { width: number; height: number }): void {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    const near = (device: number, css: number) => Math.abs(device - css * dpr) < 2;
    const exact = devicePx && near(devicePx.width, width) && near(devicePx.height, height) ? devicePx : undefined;
    for (const canvas of [this.glCanvas, this.overlayCanvas]) {
      canvas.width = Math.max(1, exact?.width ?? Math.round(width * dpr));
      canvas.height = Math.max(1, exact?.height ?? Math.round(height * dpr));
    }
  }

  /**
   * Send series' points to the GPU. webgl-plot can't grow a line in place (updateLinePoints
   * needs the same length), so each series gets a buffer with room to spare, padded by
   * repeating its last point (zero-length segments draw nothing). New points are then written
   * in place; the buffers are only re-created when the series set changes or a series outgrows
   * its buffer, which then doubles.
   * @param changed the series whose points changed, by name; all of them when left out.
   */
  upload(series: DrawSeries[], changed?: ReadonlySet<string>): void {
    const relayout =
      series.length !== this.names.length ||
      series.some((s, i) => s.name !== this.names[i] || s.points.length * 2 > this.buffers[i].length);
    if (!relayout) {
      series.forEach((s, i) => {
        if (changed && !changed.has(s.name)) return;
        this.fill(this.buffers[i], s.points);
        this.lines.updateLinePoints(i, this.buffers[i]);
      });
      return;
    }
    if (series.length > this.capacity) {
      this.lines.cleanup();
      this.capacity = Math.max(series.length, this.capacity * 2);
      this.lines = new WebglLinePlot(this.gl, this.capacity);
    }
    this.names = series.map((s) => s.name);
    this.buffers = series.map((s) => {
      let room = MIN_ROOM;
      while (room < s.points.length) room *= 2;
      const buffer = new Float32Array(room * 2);
      this.fill(buffer, s.points);
      return buffer;
    });
    this.lines.initLines(
      series.map((s, i) => ({ points: this.buffers[i], color: hexToRgba(s.color), thickness: 1, enabled: s.visible }))
    );
  }

  draw(series: DrawSeries[], view: View | null, area: Rect, marks: OverlayMarks): void {
    const { gl } = this;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, this.width, this.height);
    if (!view) return;

    // Lines: the viewport is the plot area, so clip space (-1..1) is the plot and anything
    // outside the x range is clipped by the GPU. x is shared (global transform); y is per
    // line so each series can sit on its own axis.
    gl.viewport(
      Math.round(area.left * this.dpr),
      Math.round((this.height - area.top - area.height) * this.dpr),
      Math.round(area.width * this.dpr),
      Math.round(area.height * this.dpr)
    );
    const span = view.x.max - view.x.min;
    if (Math.abs(view.x.min - this.origin) > REBASE_SPANS * span) {
      // A deep zoom, or a long live session: move the origin to the view and re-upload
      this.origin = view.x.min;
      this.upload(series);
    }
    const sx = 2 / span;
    this.lines.setGlobalTransform([sx, 1], [-1 - (view.x.min - this.origin) * sx, 0]);
    series.forEach((s, i) => {
      const y = view.axes[view.seriesAxis[i]];
      this.lines.setLineEnabled(i, !!y && s.visible && s.points.length > 0);
      if (!y) return;
      const sy = 2 / (y.max - y.min);
      this.lines.updateLineTransform(i, [1, sy], [0, -1 - y.min * sy]);
    });
    this.lines.draw();

    this.drawAxes(series, view, area);
    this.drawMarks(area, marks);
  }

  destroy(): void {
    this.lines.cleanup();
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  /** Write `points` into `buffer` relative to `origin`, repeating the last one to the end. */
  private fill(buffer: Float32Array, points: DrawSeries['points']): void {
    points.forEach((p, i) => {
      buffer[2 * i] = p.x - this.origin;
      buffer[2 * i + 1] = p.y;
    });
    const n = points.length;
    for (let i = 2 * n; i < buffer.length; i += 2) {
      buffer[i] = n > 0 ? buffer[2 * n - 2] : 0;
      buffer[i + 1] = n > 0 ? buffer[2 * n - 1] : 0;
    }
  }

  private drawAxes(series: DrawSeries[], view: View, area: Rect): void {
    const { ctx } = this;
    const bottom = area.top + area.height;
    const { xToPx, yToPx } = pixelMapping(view, area);
    ctx.font = this.font;
    ctx.lineWidth = 1;

    // plot frame, so the plot's edges show even where no grid line falls (y min/max set)
    ctx.strokeStyle = GRID;
    ctx.strokeRect(area.left + 0.5, area.top + 0.5, area.width - 1, area.height - 1);

    // x grid and labels
    ctx.fillStyle = AXIS_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const measure = (label: string) => ctx.measureText(label).width;
    const { ticks, labels } = timeAxis(view.x, area.width, measure);
    ticks.forEach((t, i) => {
      const px = Math.round(xToPx(t)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, area.top);
      ctx.lineTo(px, bottom);
      ctx.stroke();
      // A label that would run off the canvas is left out rather than cut in half
      const half = measure(labels[i]) / 2;
      if (px - half >= 0 && px + half <= this.width) ctx.fillText(labels[i], px, bottom + 8);
    });

    // y axes: one shared white axis, or one per visible series, marked with a stripe in its
    // line colour and labelled in a lightened tint of it (the raw palette is too dark to read)
    const yMaxTicks = Math.max(2, Math.floor(area.height / 50));
    const slots = axisSlots(view.axes.length);
    ctx.textBaseline = 'middle';
    view.axes.forEach((range, i) => {
      const ticks = niceTicks(range, yMaxTicks);
      const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
      const { side, slot } = slots[i];
      const edge = side === 'left' ? area.left - slot * AXIS_WIDTH : area.left + area.width + slot * AXIS_WIDTH;
      const x = side === 'left' ? edge - 6 : edge + 6;
      ctx.textAlign = side === 'left' ? 'right' : 'left';
      const color = series[view.axisSeries[i]]?.color;
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(side === 'left' ? edge - 3 : edge, area.top, 3, area.height);
      }
      ctx.fillStyle = color ? lighten(color, LABEL_LIGHTEN) : AXIS_TEXT;
      for (const v of ticks) {
        const py = Math.round(yToPx(v, range)) + 0.5;
        if (i === 0) {
          ctx.beginPath();
          ctx.moveTo(area.left, py);
          ctx.lineTo(area.left + area.width, py);
          ctx.stroke();
        }
        // A label on the bottom edge sits above it, clear of the first x label below the corner
        const onBottom = py > bottom - 7;
        ctx.textBaseline = onBottom ? 'bottom' : 'middle';
        ctx.fillText(formatTick(v, step), x, onBottom ? bottom : py);
      }
    });

    // per-day boundaries on multi-day historical ranges
    if (view.multiDay) {
      ctx.strokeStyle = DAY_LINE;
      ctx.fillStyle = AXIS_TEXT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.setLineDash([4, 4]);
      for (const t of dayBoundaries(view.x)) {
        const px = Math.round(xToPx(t)) + 0.5;
        ctx.beginPath();
        ctx.moveTo(px, area.top);
        ctx.lineTo(px, bottom);
        ctx.stroke();
        ctx.fillText(formatDayLabel(t), px, area.top - 4);
      }
      ctx.setLineDash([]);
    }
  }

  private drawMarks(area: Rect, marks: OverlayMarks): void {
    const { ctx } = this;
    if (marks.selection) {
      const from = Math.min(marks.selection.from, marks.selection.to);
      ctx.fillStyle = 'rgba(143, 202, 221, 0.2)';
      ctx.fillRect(from, area.top, Math.abs(marks.selection.to - marks.selection.from), area.height);
    }
    if (marks.crosshairX !== undefined) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.moveTo(Math.round(marks.crosshairX) + 0.5, area.top);
      ctx.lineTo(Math.round(marks.crosshairX) + 0.5, area.top + area.height);
      ctx.stroke();
    }
    for (const dot of marks.dots ?? []) {
      ctx.fillStyle = dot.color;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}

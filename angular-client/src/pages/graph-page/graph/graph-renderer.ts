import { WebglLinePlot } from 'webgl-plot';
import { GraphData } from 'src/utils/types.utils';
import {
  AXIS_WIDTH,
  axisSlots,
  dayBoundaries,
  formatDayLabel,
  formatTick,
  formatTimeTick,
  niceTicks,
  pixelMapping,
  Rect,
  timeTicks,
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
const FONT = '12px sans-serif';
/**
 * How many view widths the view may drift from `origin` before x is re-uploaded relative to
 * the view. Float32 holds about 7 digits, so this keeps a visible point's position exact to
 * well under a pixel however far into a long range the view is zoomed.
 */
const REBASE_SPANS = 100;

const hexToRgba = (hex: string): [number, number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
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
  }

  /** Match both canvases to the container's CSS size at device resolution. */
  resize(width: number, height: number, dpr: number): void {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    for (const canvas of [this.glCanvas, this.overlayCanvas]) {
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
    }
  }

  /**
   * Send every series' points to the GPU. webgl-plot can't grow a line in place
   * (updateLinePoints needs the same length), so any new point re-uploads all lines.
   */
  upload(series: DrawSeries[]): void {
    if (series.length > this.capacity) {
      this.lines.cleanup();
      this.capacity = Math.max(series.length, this.capacity * 2);
      this.lines = new WebglLinePlot(this.gl, this.capacity);
    }
    this.lines.initLines(
      series.map((s) => {
        const xy = new Float32Array(s.points.length * 2);
        s.points.forEach((p, i) => {
          xy[2 * i] = p.x - this.origin;
          xy[2 * i + 1] = p.y;
        });
        return { points: xy, color: hexToRgba(s.color), thickness: 1, enabled: s.visible };
      })
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
      const sy = 2 / (y.max - y.min);
      this.lines.updateLineTransform(i, [1, sy], [0, -1 - y.min * sy]);
      this.lines.setLineEnabled(i, s.visible);
    });
    this.lines.draw();

    this.drawAxes(series, view, area);
    this.drawMarks(area, marks);
  }

  destroy(): void {
    this.lines.cleanup();
    this.gl.getExtension('WEBGL_lose_context')?.loseContext();
  }

  private drawAxes(series: DrawSeries[], view: View, area: Rect): void {
    const { ctx } = this;
    const bottom = area.top + area.height;
    const { xToPx, yToPx } = pixelMapping(view, area);
    ctx.font = FONT;
    ctx.lineWidth = 1;

    // x grid and labels
    ctx.strokeStyle = GRID;
    ctx.fillStyle = AXIS_TEXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xMaxTicks = Math.max(2, Math.floor(area.width / (view.multiDay ? 130 : 100)));
    for (const t of timeTicks(view.x, xMaxTicks)) {
      const px = Math.round(xToPx(t)) + 0.5;
      ctx.beginPath();
      ctx.moveTo(px, area.top);
      ctx.lineTo(px, bottom);
      ctx.stroke();
      ctx.fillText(formatTimeTick(t, view.multiDay), px, bottom + 6);
    }

    // y axes: one shared white axis, or one per series in its line colour
    const yMaxTicks = Math.max(2, Math.floor(area.height / 50));
    const slots = axisSlots(view.axes.length);
    ctx.textBaseline = 'middle';
    view.axes.forEach((range, i) => {
      const ticks = niceTicks(range, yMaxTicks);
      const step = ticks.length > 1 ? ticks[1] - ticks[0] : 1;
      const { side, slot } = slots[i];
      const x = side === 'left' ? area.left - slot * AXIS_WIDTH - 6 : area.left + area.width + slot * AXIS_WIDTH + 6;
      ctx.textAlign = side === 'left' ? 'right' : 'left';
      ctx.fillStyle = view.axes.length > 1 ? series[i]?.color ?? AXIS_TEXT : AXIS_TEXT;
      for (const v of ticks) {
        const py = Math.round(yToPx(v, range)) + 0.5;
        if (i === 0) {
          ctx.beginPath();
          ctx.moveTo(area.left, py);
          ctx.lineTo(area.left + area.width, py);
          ctx.stroke();
        }
        ctx.fillText(formatTick(v, step), x, py);
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

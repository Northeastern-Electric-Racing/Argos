import { binarySearchInsertIndex } from 'src/utils/array.utils';
import { GraphData } from 'src/utils/types.utils';

/**
 * Pure axis, range and layout math for the graph page's webgl-plot chart.
 * webgl-plot only draws lines in clip space, so everything a charting library would
 * normally own (ranges, ticks, labels, axis placement) lives here.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

/** Width reserved for each y-axis's tick labels, in CSS px. */
export const AXIS_WIDTH = 56;
const PLOT_TOP = 22; // room for the day-boundary labels
const PLOT_BOTTOM = 26; // room for the x-axis tick labels
const PLOT_EDGE = 12; // breathing room on a side with no axis

export interface Range {
  min: number;
  max: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface AxisSlot {
  side: 'left' | 'right';
  /** 0 is nearest the plot; higher slots stack outward. */
  slot: number;
}

export interface ViewInput {
  series: { points: GraphData[]; visible: boolean }[];
  multiAxis: boolean;
  realTime: boolean;
  /** Live window width; undefined fits all data. Ignored outside real-time mode. */
  windowMs: number | undefined;
  /** User zoom, which overrides the live window and the fit-all range. */
  zoom: Range | null;
  yOverride: { min: number | null; max: number | null };
}

export interface View {
  x: Range;
  /** One range per y-axis. */
  axes: Range[];
  /** Series index -> axis index. */
  seriesAxis: number[];
  /** Historical data spanning more than a day: date-aware labels and day boundaries. */
  multiDay: boolean;
}

/** A 1/2/5 x 10^n step that splits `span` into at most `maxTicks` pieces. */
export function niceStep(span: number, maxTicks: number): number {
  if (!(span > 0) || !isFinite(span)) return 1;
  const raw = span / Math.max(1, maxTicks);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / magnitude;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * magnitude;
}

// Strips float noise such as 0.30000000000000004 from tick values.
const clean = (v: number): number => Number(v.toPrecision(12));

/** Evenly spaced round values inside `range`. */
export function niceTicks(range: Range, maxTicks: number): number[] {
  const step = niceStep(range.max - range.min, maxTicks);
  const ticks: number[] = [];
  for (let i = Math.ceil(range.min / step); i * step <= range.max + step * 1e-9; i++) {
    ticks.push(clean(i * step));
  }
  return ticks;
}

const TIME_STEPS = [
  1,
  2,
  5,
  10,
  20,
  50,
  100,
  200,
  500,
  1000,
  2000,
  5000,
  10_000,
  15_000,
  30_000,
  MINUTE_MS,
  2 * MINUTE_MS,
  5 * MINUTE_MS,
  10 * MINUTE_MS,
  15 * MINUTE_MS,
  30 * MINUTE_MS,
  HOUR_MS,
  2 * HOUR_MS,
  3 * HOUR_MS,
  6 * HOUR_MS,
  12 * HOUR_MS,
  DAY_MS
];

/** Round wall-clock times inside `range` (epoch ms), aligned to local time so hours land on :00. */
export function timeTicks(range: Range, maxTicks: number): number[] {
  const span = range.max - range.min;
  if (!(span > 0)) return [range.min];
  const step = TIME_STEPS.find((s) => span / s <= maxTicks) ?? niceStep(span / DAY_MS, maxTicks) * DAY_MS;
  const tzOffset = new Date(range.min).getTimezoneOffset() * MINUTE_MS;
  const ticks: number[] = [];
  for (let t = Math.ceil((range.min - tzOffset) / step) * step + tzOffset; t <= range.max; t += step) {
    ticks.push(t);
  }
  return ticks;
}

export function formatTimeTick(ms: number, multiDay: boolean): string {
  const d = new Date(ms);
  if (!multiDay) return d.toLocaleTimeString('en-US', { hour12: false });
  const date = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

export function formatTooltipTime(ms: number): string {
  return new Date(ms).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
    hour12: false
  });
}

export function formatDayLabel(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** A y tick label with only as many decimals as the tick step needs. */
export function formatTick(value: number, step: number): string {
  const decimals = Math.min(6, Math.max(0, -Math.floor(Math.log10(step))));
  return value.toFixed(decimals);
}

/** Local midnights strictly inside `range`. */
export function dayBoundaries(range: Range): number[] {
  const boundaries: number[] = [];
  const cursor = new Date(range.min);
  cursor.setHours(24, 0, 0, 0);
  while (cursor.getTime() < range.max) {
    boundaries.push(cursor.getTime());
    cursor.setDate(cursor.getDate() + 1);
  }
  return boundaries;
}

/** Index of the first point with x > `x` in x-sorted `points`. */
function upperBound(points: GraphData[], x: number): number {
  let lo = 0;
  let hi = points.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (points[mid].x <= x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** The point nearest `x` in x-sorted `points`, or undefined when there are none. */
export function nearestPoint(points: GraphData[], x: number): GraphData | undefined {
  if (points.length === 0) return undefined;
  const i = binarySearchInsertIndex(points, x);
  if (i === 0) return points[0];
  if (i === points.length) return points[i - 1];
  return x - points[i - 1].x <= points[i].x - x ? points[i - 1] : points[i];
}

/** Min and max y of the points with x inside `range`, or null when none are. */
export function valueExtent(points: GraphData[], range: Range): Range | null {
  const lo = binarySearchInsertIndex(points, range.min);
  const hi = upperBound(points, range.max);
  if (lo >= hi) return null;
  let min = Infinity;
  let max = -Infinity;
  for (let i = lo; i < hi; i++) {
    const { y } = points[i];
    if (y < min) min = y;
    if (y > max) max = y;
  }
  return { min, max };
}

/**
 * The y range to draw: the data extent snapped out to round values, with the user's
 * y min/max taking precedence. Snapping keeps the axis still while live values wobble.
 */
export function axisRange(extent: Range | null, override: { min: number | null; max: number | null }): Range {
  let min = override.min ?? extent?.min ?? 0;
  let max = override.max ?? extent?.max ?? 1;
  if (max <= min) {
    const pad = Math.abs(min) * 0.1 || 1;
    if (override.min === null) min -= pad;
    if (override.max === null || max <= min) max = min + 2 * pad;
  }
  const step = niceStep(max - min, 5);
  if (override.min === null) min = clean(Math.floor(min / step) * step);
  if (override.max === null) max = clean(Math.ceil(max / step) * step);
  return { min, max };
}

/** Alternate axes left/right, stacking outward, so stacked axes stay readable (as with ApexCharts' `opposite`). */
export function axisSlots(count: number): AxisSlot[] {
  return Array.from({ length: count }, (_, i) => ({ side: i % 2 === 0 ? 'left' : 'right', slot: Math.floor(i / 2) }));
}

/** The plot rectangle inside a `width` x `height` chart, after the axes' gutters. */
export function plotArea(width: number, height: number, axisCount: number): Rect {
  const slots = axisSlots(Math.max(1, axisCount));
  const left = slots.filter((s) => s.side === 'left').length * AXIS_WIDTH;
  const rightAxes = slots.filter((s) => s.side === 'right').length;
  const right = rightAxes > 0 ? rightAxes * AXIS_WIDTH : PLOT_EDGE;
  return {
    left,
    top: PLOT_TOP,
    width: Math.max(1, width - left - right),
    height: Math.max(1, height - PLOT_TOP - PLOT_BOTTOM)
  };
}

/** Conversions between data values and CSS px inside the chart. */
export function pixelMapping(view: View, area: Rect) {
  const xSpan = view.x.max - view.x.min;
  return {
    xToPx: (x: number) => area.left + ((x - view.x.min) / xSpan) * area.width,
    pxToX: (px: number) => view.x.min + ((px - area.left) / area.width) * xSpan,
    yToPx: (y: number, r: Range) => area.top + area.height - ((y - r.min) / (r.max - r.min)) * area.height
  };
}

/** The x range and per-axis y ranges to draw, or null when there is nothing to draw. */
export function computeView(input: ViewInput): View | null {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const { points } of input.series) {
    if (points.length === 0) continue;
    // Series are kept sorted by x, so the endpoints are the extrema.
    minX = Math.min(minX, points[0].x);
    maxX = Math.max(maxX, points[points.length - 1].x);
  }
  if (!isFinite(minX)) return null;

  let x: Range;
  if (input.zoom) {
    x = input.zoom;
  } else if (input.realTime && input.windowMs !== undefined) {
    x = { min: maxX - input.windowMs, max: maxX };
  } else {
    x = { min: minX, max: maxX };
  }
  if (x.max <= x.min) x = { min: x.min - 500, max: x.max + 500 };

  const extentOf = (series: ViewInput['series']): Range | null =>
    series.reduce<Range | null>((acc, s) => {
      const e = s.visible ? valueExtent(s.points, x) : null;
      if (!e) return acc;
      return acc ? { min: Math.min(acc.min, e.min), max: Math.max(acc.max, e.max) } : e;
    }, null);

  const axes = input.multiAxis
    ? input.series.map((s) => axisRange(extentOf([s]), input.yOverride))
    : [axisRange(extentOf(input.series), input.yOverride)];

  return {
    x,
    axes,
    seriesAxis: input.series.map((_, i) => (input.multiAxis ? i : 0)),
    multiDay: !input.realTime && maxX - minX > DAY_MS
  };
}

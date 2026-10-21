import { LineData, Time, UTCTimestamp } from 'lightweight-charts';
import { GraphData } from 'src/utils/types.utils';

export const DAY_MS = 24 * 60 * 60 * 1000;

// ApexCharts' default palette, so series keep the colors people are used to.
export const SERIES_COLORS = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0', '#3F51B5', '#03A9F4', '#4CAF50'];

export const seriesColor = (index: number): string => SERIES_COLORS[index % SERIES_COLORS.length];

/** lightweight-charts' default time scale takes UNIX seconds; fractional seconds keep sub-second data apart. */
export const toChartTime = (ms: number): UTCTimestamp => (ms / 1000) as UTCTimestamp;

export const fromChartTime = (time: Time): number => (time as number) * 1000;

/**
 * Converts a series (sorted by x, in ms) to lightweight-charts line data.
 * The library needs strictly increasing times, so a repeated timestamp keeps its latest value,
 * matching what series.update() does when a point lands on the last point's time.
 */
export function toLineData(points: GraphData[]): LineData<Time>[] {
  const out: LineData<Time>[] = [];
  for (const point of points) {
    const time = toChartTime(point.x);
    if (out.length > 0 && out[out.length - 1].time === time) {
      out[out.length - 1] = { time, value: point.y };
    } else {
      out.push({ time, value: point.y });
    }
  }
  return out;
}

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

/** Whitespace grid steps, each dividing the next clock unit up, so grid times land on round times. */
const GRID_STEPS_MS = [
  ...[1, 2, 5, 10, 20, 50, 100, 200, 500],
  ...[1, 2, 5, 10, 15, 30].map((n) => n * SECOND_MS),
  ...[1, 2, 5, 10, 15, 30].map((n) => n * MINUTE_MS),
  ...[1, 2, 3, 6, 12].map((n) => n * HOUR_MS),
  DAY_MS
];

/**
 * Step (ms) of the whitespace grid that spaces the time scale by time: the smallest round step that
 * puts at most `maxBars` grid points across `spanMs`.
 */
export function gridStep(spanMs: number, maxBars: number): number {
  const wanted = spanMs / maxBars;
  return GRID_STEPS_MS.find((step) => step >= wanted) ?? Math.ceil(wanted / DAY_MS) * DAY_MS;
}

const pad = (n: number, width = 2) => n.toString().padStart(width, '0');

const timeOfDay = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

/** Time-of-day with milliseconds only when the instant isn't on a whole second. */
const preciseTimeOfDay = (d: Date) =>
  d.getMilliseconds() === 0 ? timeOfDay(d) : `${timeOfDay(d)}.${pad(d.getMilliseconds(), 3)}`;

/** Time axis labels: time of day, or date and minute on multi-day ranges. */
export function formatTickMark(time: Time, multiDay: boolean): string {
  const d = new Date(fromChartTime(time));
  if (multiDay) {
    return `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  return preciseTimeOfDay(d);
}

/** Crosshair label and hover legend time, e.g. `3/14/26, 09:26:53.589`. */
export function formatCrosshairTime(time: Time): string {
  const d = new Date(fromChartTime(time));
  return `${d.getMonth() + 1}/${d.getDate()}/${pad(d.getFullYear() % 100)}, ${preciseTimeOfDay(d)}`;
}

/** Values are rounded to 4 decimals on the way in; show them without trailing zeros. */
export const formatValue = (value: number): string => (Math.round(value * 10000) / 10000).toString();

/**
 * Which price scale a series uses. One shared left axis by default; with multiple y-axes the first
 * two series get the left and right axes and the rest get their own overlay scale, which has no
 * axis (lightweight-charts draws only two price axes per pane), so their values show only on hover.
 */
export function priceScaleIdFor(index: number, multipleYAxes: boolean): string {
  if (!multipleYAxes || index === 0) return 'left';
  if (index === 1) return 'right';
  return `overlay-${index}`;
}

export interface DayBoundary {
  /** Local midnight, in ms. */
  timeMs: number;
  label: string;
}

/** One boundary per local midnight across the series; nothing unless the data spans more than a day. */
export function buildDayBoundaries(lines: GraphData[][]): DayBoundary[] {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const line of lines) {
    if (line.length === 0) continue;
    minX = Math.min(minX, line[0].x);
    maxX = Math.max(maxX, line[line.length - 1].x);
  }
  if (!isFinite(minX) || maxX - minX <= DAY_MS) return [];

  const boundaries: DayBoundary[] = [];
  const cursor = new Date(minX);
  cursor.setHours(24, 0, 0, 0);
  while (cursor.getTime() <= maxX) {
    const label = cursor.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    boundaries.push({ timeMs: cursor.getTime(), label });
    cursor.setDate(cursor.getDate() + 1);
  }
  return boundaries;
}

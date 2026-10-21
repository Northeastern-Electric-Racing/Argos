import { LineData, TickMarkType, Time, UTCTimestamp } from 'lightweight-charts';
import { GraphData } from 'src/utils/types.utils';

export const DAY_MS = 24 * 60 * 60 * 1000;

// ApexCharts' default palette, so series keep the colors people are used to.
export const SERIES_COLORS = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0', '#3F51B5', '#03A9F4', '#4CAF50'];

export const seriesColor = (index: number): string => SERIES_COLORS[index % SERIES_COLORS.length];

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;

/** What to add to an instant (ms) to get its wall-clock time in a time zone, written as UTC. */
export type ZoneOffset = (ms: number) => number;

export const localZoneOffset: ZoneOffset = (ms) => -new Date(ms).getTimezoneOffset() * MINUTE_MS;

/**
 * A clock change within `reach` of `ms` that turns the clock back (local times repeat after it):
 * when it happens, how far back it goes, and the offset before it. Clock changes up to an hour.
 */
function fallBackNear(ms: number, reach: number, offset: ZoneOffset) {
  let lo = Math.floor(ms - reach);
  let hi = Math.ceil(ms + reach);
  const before = offset(lo);
  const after = offset(hi);
  if (after >= before) return null;
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (offset(mid) === before) lo = mid;
    else hi = mid;
  }
  return { at: hi, back: before - after, before };
}

/**
 * Chart time (ms) of an instant: its local wall-clock time written as UTC. lightweight-charts places
 * and labels ticks in UTC, and this shift is its documented way to show another time zone, so ticks
 * and day changes land on local round times. Where the clock turns back, the two hours around the
 * change share one hour of local time, so they're drawn there at half width to keep chart times
 * strictly increasing (as the library needs).
 */
export function toChartMs(ms: number, offset: ZoneOffset = localZoneOffset): number {
  const fallBack = fallBackNear(ms, HOUR_MS, offset);
  if (fallBack) {
    const start = fallBack.at - fallBack.back;
    if (ms >= start && ms < fallBack.at + fallBack.back) return start + fallBack.before + (ms - start) / 2;
  }
  return ms + offset(ms);
}

/** The instant (ms) whose chart time is `chartMs`; the inverse of toChartMs. */
export function fromChartMs(chartMs: number, offset: ZoneOffset = localZoneOffset): number {
  // Within an hour of the instant, so near enough to find a clock change around it.
  const guess = chartMs - offset(chartMs);
  const fallBack = fallBackNear(guess, 3 * HOUR_MS, offset);
  if (!fallBack) return chartMs - offset(guess);
  const start = fallBack.at - fallBack.back;
  const localStart = start + fallBack.before;
  if (chartMs < localStart) return chartMs - fallBack.before;
  if (chartMs < localStart + fallBack.back) return start + 2 * (chartMs - localStart);
  return chartMs - (fallBack.before - fallBack.back);
}

/** lightweight-charts' default time scale takes UNIX seconds; fractional seconds keep sub-second data apart. */
export const toChartTime = (ms: number): UTCTimestamp => (toChartMs(ms) / 1000) as UTCTimestamp;

export const fromChartTime = (time: Time, offset: ZoneOffset = localZoneOffset): number =>
  fromChartMs((time as number) * 1000, offset);

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

// The helpers below take a wall-clock time written as UTC (a chart time), so they read it with getUTC*.
const hourMinute = (d: Date) => `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;

const timeOfDay = (d: Date) => `${hourMinute(d)}:${pad(d.getUTCSeconds())}`;

/** Time-of-day with milliseconds only when the instant isn't on a whole second. */
const preciseTimeOfDay = (d: Date) =>
  d.getUTCMilliseconds() === 0 ? timeOfDay(d) : `${timeOfDay(d)}.${pad(d.getUTCMilliseconds(), 3)}`;

/**
 * Time axis labels, by the weight the library gives each tick: the date on a day change (and the
 * time too if the tick isn't on midnight), the time of day otherwise.
 */
export function formatTickMark(time: Time, type: TickMarkType): string {
  const d = new Date((time as number) * 1000);
  const onMinute = d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;
  if (type <= TickMarkType.DayOfMonth) {
    const date = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
    return onMinute && hourMinute(d) === '00:00' ? date : `${date} ${hourMinute(d)}`;
  }
  return type === TickMarkType.Time && onMinute ? hourMinute(d) : preciseTimeOfDay(d);
}

/** Crosshair label and hover legend time in the local zone, e.g. `3/14/26, 09:26:53.589`. */
export function formatCrosshairTime(time: Time, offset: ZoneOffset = localZoneOffset): string {
  // From the instant, so the repeated hour where the clock turns back reads true too.
  const instant = fromChartTime(time, offset);
  const d = new Date(instant + offset(instant));
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${pad(d.getUTCFullYear() % 100)}, ${preciseTimeOfDay(d)}`;
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

import type { ChartOptions } from 'chart.js';
import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import { GraphData } from 'src/utils/types.utils';

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * ApexCharts' default palette first, so series keep the colors users are used to, then five more that read on
 * the dark background, so a sixth topic doesn't repeat the first one's color.
 */
export const SERIES_COLORS = [
  '#008FFB',
  '#00E396',
  '#FEB019',
  '#FF4560',
  '#775DD0',
  '#00D9E9',
  '#FF66C3',
  '#C7F464',
  '#F86624',
  '#A5978B'
];

const TICK_COLOR = '#fff';
const GRID_COLOR = 'rgba(255, 255, 255, 0.1)';
/** The app's dark-teal surface and light-blue outline, as on its toolbar buttons. */
const THEME_SURFACE = '#0c2026';
const THEME_OUTLINE = '#8fcadd';

export type ScaleConfig = NonNullable<ChartOptions<'line'>['scales']>[string];

export type DataSpan = { minX: number; maxX: number; spanMs: number };

/** Chart.js scale id of a series' y-axis: the shared `y` axis, or one axis per series when multi-axis is on. */
export function yAxisIdFor(index: number, multipleYAxes: boolean): string {
  return multipleYAxes && index > 0 ? `y${index}` : 'y';
}

/**
 * Builds the y scales for the current series keys: one shared axis, or one per series
 * (alternating sides, colored like their series) when multi-axis is on. User y-limits apply to every axis.
 */
export function buildYScales(
  keys: string[],
  multipleYAxes: boolean,
  limits: { yMin: number | null; yMax: number | null },
  colors: string[] = []
): Record<string, ScaleConfig> {
  const base = (): ScaleConfig => ({
    type: 'linear',
    // Shown only while one of its series is (a series hidden from the legend takes its axis with it)
    display: 'auto',
    min: limits.yMin ?? undefined,
    max: limits.yMax ?? undefined,
    // Headroom, so lines at the extremes clear the plot border; explicit user limits still win
    grace: '5%',
    ticks: { color: TICK_COLOR },
    grid: { color: GRID_COLOR }
  });

  if (!multipleYAxes || keys.length === 0) {
    return { y: base() };
  }

  const scales: Record<string, ScaleConfig> = {};
  keys.forEach((key, index) => {
    scales[yAxisIdFor(index, true)] = {
      ...base(),
      position: index % 2 !== 0 ? 'right' : 'left', // Alternate sides for each y-axis
      // Only the first axis draws grid lines; stacked grids from every axis are unreadable
      grid: { color: GRID_COLOR, drawOnChartArea: index === 0 },
      ticks: { color: colors[index] ?? TICK_COLOR },
      title: {
        display: true,
        // A single-value topic's series is "<topic> 0"; title it by the topic alone
        text: key.replace(/ 0$/, ''),
        color: colors[index] ?? 'grey',
        font: { size: 20, weight: 'bold' }
      }
    };
  });
  return scales;
}

/** Earliest and latest x across every series; series are kept sorted by x, so endpoints are the extrema. */
export function computeDataSpan(data: Map<string, GraphData[]>): DataSpan | null {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const points of data.values()) {
    if (points.length === 0) continue;
    if (points[0].x < minX) minX = points[0].x;
    if (points[points.length - 1].x > maxX) maxX = points[points.length - 1].x;
  }
  if (!isFinite(minX) || !isFinite(maxX)) return null;
  return { minX, maxX, spanMs: maxX - minX };
}

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const MAX_X_TICKS = 6;

/** Clock-friendly tick steps: 1 to 500 ms, 1/2/5/10/15/30 s and min, 1/2/3/6/12 h, then days. */
const TIME_STEPS_MS = [
  ...[1, 2, 5, 10, 20, 50, 100, 200, 500],
  ...[1, 2, 5, 10, 15, 30].map((n) => n * SECOND_MS),
  ...[1, 2, 5, 10, 15, 30].map((n) => n * MINUTE_MS),
  ...[1, 2, 3, 6, 12].map((n) => n * HOUR_MS),
  ...[1, 2, 7].map((n) => n * DAY_MS)
];

/** The smallest clock-friendly step that fits the span in at most `maxTicks` intervals. */
export function pickTimeStep(spanMs: number, maxTicks = MAX_X_TICKS): number {
  return TIME_STEPS_MS.find((step) => spanMs / step <= maxTicks) ?? Math.ceil(spanMs / maxTicks / DAY_MS) * DAY_MS;
}

const tzOffsetMs = (t: number) => new Date(t).getTimezoneOffset() * MINUTE_MS;

/**
 * Tick values on whole multiples of a clock-friendly step in local time (every 5 s, every 30 min, midnight
 * and noon...). Being multiples, they stay put as the live window slides. A linear scale's own 1/2/5 x 10^n ms
 * steps land on arbitrary clock times past ~10 s, and Chart.js' time scale auto-skips its unit ticks unevenly.
 */
export function buildTimeTicks(min: number, max: number, maxTicks = MAX_X_TICKS): number[] {
  const step = pickTimeStep(max - min, maxTicks);
  const ticks: number[] = [];
  // Step on a local-time grid (UTC shifted by the offset at min), then map each tick back with its own offset,
  // so hour and day ticks stay on local whole hours and midnights across a DST change.
  for (let local = Math.ceil((min - tzOffsetMs(min)) / step) * step; ; local += step) {
    const t = local + tzOffsetMs(local + tzOffsetMs(min));
    if (t > max) break;
    if (t >= min) ticks.push(t);
  }
  return ticks;
}

const TIME_LABELS = {
  millis: new Intl.DateTimeFormat('en-US', {
    hourCycle: 'h23',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  }),
  seconds: new Intl.DateTimeFormat('en-US', { hourCycle: 'h23', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  minutes: new Intl.DateTimeFormat('en-US', { hourCycle: 'h23', hour: '2-digit', minute: '2-digit' }),
  date: new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric' })
};

const TOOLTIP_TIME: Intl.DateTimeFormatOptions = {
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
};
const TOOLTIP_LABELS = {
  seconds: new Intl.DateTimeFormat('en-US', TOOLTIP_TIME),
  millis: new Intl.DateTimeFormat('en-US', { ...TOOLTIP_TIME, fractionalSecondDigits: 3 })
};

/** A tooltip title: the point's date and 24-hour time, to the millisecond once the x ticks are sub-second. */
export function formatTooltipTime(value: number, axisSpanMs: number): string {
  return (pickTimeStep(axisSpanMs) < SECOND_MS ? TOOLTIP_LABELS.millis : TOOLTIP_LABELS.seconds).format(value);
}

/** An x tick label as precise as the step needs; with hour-or-longer steps, local midnights show their date. */
export function formatTimeTick(value: number, stepMs: number): string {
  if (stepMs >= HOUR_MS && value - startOfLocalDay(value) === 0) return TIME_LABELS.date.format(value);
  if (stepMs < SECOND_MS) return TIME_LABELS.millis.format(value);
  if (stepMs < MINUTE_MS) return TIME_LABELS.seconds.format(value);
  return TIME_LABELS.minutes.format(value);
}

function startOfLocalDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** One dashed vertical line, labelled with the date, at each local midnight inside the span. */
export function buildDayBoundaryAnnotations(span: { minX: number; maxX: number }): AnnotationOptions<'line'>[] {
  const annotations: AnnotationOptions<'line'>[] = [];
  // First local-midnight strictly after minX.
  const cursor = new Date(span.minX);
  cursor.setHours(24, 0, 0, 0);
  for (let t = cursor.getTime(); t < span.maxX; t += DAY_MS) {
    annotations.push({
      type: 'line',
      xMin: t,
      xMax: t,
      borderColor: THEME_OUTLINE,
      borderWidth: 1,
      borderDash: [4, 4],
      label: {
        display: true,
        // A vertical line runs bottom (start) to top (end); the top keeps the label off the data and x ticks
        position: 'end',
        color: '#fff',
        backgroundColor: THEME_SURFACE,
        borderColor: THEME_OUTLINE,
        borderWidth: 1,
        font: { size: 11 },
        content: new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      }
    });
  }
  return annotations;
}

/** Base options for the graph page's line chart. Scales, windowing and annotations are filled in per frame. */
export function buildBaseOptions(callbacks: { onZoom: () => void }): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    // Points are pushed as {x, y} already sorted by x, so Chart.js can skip parsing and binary-search hovers
    parsing: false,
    normalized: true,
    spanGaps: true,
    font: { family: "'Roboto', sans-serif" },
    // Nearest by distance in x and y: nearest in x alone always picks the fastest topic's point
    interaction: { mode: 'nearest', intersect: false, axis: 'xy' },
    // The x-axis reserves half of an edge tick's label as it arrives; fixed room keeps the plot from jumping
    layout: { padding: { right: 32, left: 8 } },
    elements: {
      point: { radius: 0, hoverRadius: 4 },
      line: { borderWidth: 3, tension: 0 }
    },
    scales: {
      // Epoch-ms on a linear scale, with ticks replaced by clock-aligned ones (see buildTimeTicks)
      x: {
        type: 'linear',
        afterBuildTicks: (scale) => {
          scale.ticks = buildTimeTicks(scale.min, scale.max).map((value) => ({ value }));
        },
        ticks: {
          color: TICK_COLOR,
          maxTicksLimit: MAX_X_TICKS,
          maxRotation: 0,
          callback(value) {
            return formatTimeTick(+value, pickTimeStep(this.max - this.min));
          }
        },
        grid: { color: GRID_COLOR }
      },
      ...buildYScales([], false, { yMin: null, yMax: null })
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#fff', font: { size: 15 } }
      },
      tooltip: {
        enabled: true,
        backgroundColor: THEME_SURFACE,
        borderColor: THEME_OUTLINE,
        borderWidth: 1,
        callbacks: {
          title: (items) => {
            if (!items.length) return '';
            const { min, max } = items[0].chart.scales['x'];
            return formatTooltipTime(items[0].parsed.x ?? 0, max - min);
          }
        }
      },
      // Min-max decimation keeps peaks visible when a series has more points than pixels (long historical ranges)
      decimation: { enabled: true, algorithm: 'min-max' },
      zoom: {
        zoom: {
          // The plugin's default drag threshold is 0 px, so a click with a little jitter zoomed to a sliver
          drag: { enabled: true, threshold: 10, backgroundColor: 'rgba(143, 202, 221, 0.25)' },
          wheel: { enabled: true, modifierKey: 'ctrl' },
          pinch: { enabled: true },
          mode: 'x',
          onZoomComplete: callbacks.onZoom
        },
        pan: { enabled: true, mode: 'x', modifierKey: 'shift', onPanComplete: callbacks.onZoom },
        // Bounds drag, ctrl-wheel and pinch zoom alike
        limits: { x: { minRange: 1000 } }
      },
      annotation: { annotations: [] }
    }
  };
}

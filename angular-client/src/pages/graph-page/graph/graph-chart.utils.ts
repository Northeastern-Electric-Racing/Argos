import type {
  Chart,
  ChartArea,
  ChartEvent,
  ChartOptions,
  ChartType,
  InteractionModeFunction,
  Plugin,
  TooltipPosition,
  TooltipPositionerFunction
} from 'chart.js';
import { getRelativePosition } from 'chart.js/helpers';
import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import { binarySearchInsertIndex } from 'src/utils/array.utils';
import { GraphData } from 'src/utils/types.utils';

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * ApexCharts' default palette first, so series keep the colors users are used to, then five more that read on
 * the dark background, so a sixth topic doesn't repeat the first one's color. ApexCharts' violet #775DD0 is
 * lightened to #9B87F5: as multi-axis tick text it was 3.8:1 on the page background, under WCAG AA's 4.5:1.
 */
export const SERIES_COLORS = [
  '#008FFB',
  '#00E396',
  '#FEB019',
  '#FF4560',
  '#9B87F5',
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
    // A grid time in a skipped spring-forward hour maps back onto an earlier tick; keep ticks strictly increasing
    if (t >= min && t > (ticks.at(-1) ?? -Infinity)) ticks.push(t);
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
  // First local midnight strictly after minX, then step by calendar day: a DST day is 23 or 25 hours long
  const cursor = new Date(span.minX);
  cursor.setHours(24, 0, 0, 0);
  for (; cursor.getTime() < span.maxX; cursor.setDate(cursor.getDate() + 1)) {
    const t = cursor.getTime();
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

declare module 'chart.js' {
  interface InteractionModeMap {
    nearestPerSeries: InteractionModeFunction;
  }
  interface TooltipPositionerMap {
    cursor: TooltipPositionerFunction<ChartType>;
  }
}

/** Index of the sample nearest `x` in points sorted by x (the earlier one on a tie), or -1 when there are none. */
export function nearestIndex(points: readonly { x: number }[], x: number): number {
  if (points.length === 0) return -1;
  let lo = 0;
  let hi = points.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (points[mid].x < x) lo = mid + 1;
    else hi = mid;
  }
  // lo is the first sample at or after x; the one before it may be closer
  return lo > 0 && x - points[lo - 1].x <= points[lo].x - x ? lo - 1 : lo;
}

/** How far, in pixels, past a series' first or last sample the pointer still hovers that end sample. */
export const HOVER_SNAP_PX = 8;

/**
 * Where a series' line crosses time `x`: linear between the samples either side, as the line is drawn, or the end
 * sample when `x` is within `snap` of it. Null where the series has no data near `x`, so hover leaves it out.
 */
export function lineValueAt(points: readonly GraphData[], x: number, snap = 0): GraphData | null {
  const [first] = points;
  const last = points.at(-1);
  if (!first || !last) return null;
  if (x <= first.x) return first.x - x <= snap ? first : null;
  if (x >= last.x) return x - last.x <= snap ? last : null;
  // first.x < x < last.x, so there is a sample before x and one at or after it
  const after = binarySearchInsertIndex(points, x);
  const a = points[after - 1];
  const b = points[after];
  return b.x === x ? b : { x, y: a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x) };
}

/** The point on a dataset's drawn line at a canvas x, in data and canvas units; null where it has no data near. */
function lineAtPixel(chart: Chart, datasetIndex: number, px: number): { value: GraphData; x: number; y: number } | null {
  const xScale = chart.scales['x'];
  const time = xScale.getValueForPixel(px);
  if (time === undefined) return null;
  const snap = (HOVER_SNAP_PX * (xScale.max - xScale.min)) / (xScale.width || 1);
  // Decimation swaps a dataset's data for the decimated points, which is what its line is drawn through
  const value = lineValueAt(chart.data.datasets[datasetIndex].data as GraphData[], time, snap);
  if (!value) return null;
  const yScale = chart.scales[chart.getDatasetMeta(datasetIndex).yAxisID ?? 'y'];
  return { value, x: xScale.getPixelForValue(value.x), y: yScale.getPixelForValue(value.y) };
}

/**
 * Interaction mode (registered as `nearestPerSeries`): every visible series with data at the cursor's time, as
 * uPlot's cursor does. Built-in `index` mode assumes every series shares timestamps, which topics don't. Each item
 * carries its nearest sample's element, which Chart.js needs; the hover dot and the tooltip's value come from the
 * line at the cursor's time instead (see cursorPlugin and the tooltip's label callback).
 */
export const nearestPerSeries: InteractionModeFunction = (chart, event) => {
  const position = getRelativePosition(event, chart);
  if (!chart.isPointInArea(position)) return [];
  const time = chart.scales['x'].getValueForPixel(position.x) ?? 0;
  return chart.getSortedVisibleDatasetMetas().flatMap(({ index: datasetIndex, data: elements }) => {
    if (!lineAtPixel(chart, datasetIndex, position.x)) return [];
    const index = nearestIndex(chart.data.datasets[datasetIndex].data as { x: number }[], time);
    const element = elements[index];
    return element ? [{ element, datasetIndex, index }] : [];
  });
};

const TOOLTIP_OFFSET = 12;

/** A pointer position in canvas pixels. */
type Cursor = { x: number; y: number };

/** Below-right of the cursor, flipped to its other side where the tooltip would cross the plot's right/bottom. */
export function placeTooltip(
  cursor: Cursor,
  size: { width: number; height: number },
  area: Pick<ChartArea, 'right' | 'bottom'>
): TooltipPosition {
  const right = cursor.x + TOOLTIP_OFFSET + size.width <= area.right;
  const below = cursor.y + TOOLTIP_OFFSET + size.height <= area.bottom;
  return {
    x: cursor.x + (right ? TOOLTIP_OFFSET : -TOOLTIP_OFFSET),
    y: cursor.y + (below ? TOOLTIP_OFFSET : -TOOLTIP_OFFSET),
    xAlign: right ? 'left' : 'right',
    yAlign: below ? 'top' : 'bottom'
  };
}

/**
 * Tooltip positioner (registered as `cursor`). It runs before the tooltip measures what it now shows, so it flips on
 * the last size; cursorPlugin re-places the tooltip when the new size flips it differently.
 */
export const cursorPositioner: TooltipPositionerFunction<ChartType> = function (items, eventPosition) {
  const { x, y } = eventPosition;
  return items.length > 0 && x !== null && y !== null && placeTooltip({ x, y }, this, this.chart.chartArea);
};

/** The hover dot drawn on each line at the cursor's time. */
const HOVER_DOT = { radius: 4, borderColor: '#101010', borderWidth: 2 };
/** uPlot's cursor line color. */
const CURSOR_COLOR = '#607D8B';
/** The pointer's position over each chart's plot area; null once it leaves. */
const cursors = new WeakMap<Chart, Cursor | null>();
/** The cursor each chart last drew, so pointer moves off the plot don't redraw it for nothing. */
const drawnCursors = new WeakMap<Chart, Cursor | null>();

/** Where the pointer's time crosses a dataset's line, in data and canvas units; null off the plot or away from data. */
export function lineAtCursor(chart: Chart, datasetIndex: number): { value: GraphData; x: number; y: number } | null {
  const cursor = cursors.get(chart);
  return cursor ? lineAtPixel(chart, datasetIndex, cursor.x) : null;
}

/** Hides the cursor lines, dots and tooltip until the pointer next moves, e.g. after a zoom moved the data under it. */
export function hideCursor(chart: Chart): void {
  cursors.set(chart, null);
  chart.setActiveElements([]);
  chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
  chart.render();
}

/**
 * Dashed crosshair lines at the pointer, as in uPlot, with the hovered dots redrawn over them. The dots and the
 * tooltip come from the `nearestPerSeries` hover; this also clears them when the pointer leaves the plot area,
 * where Chart.js would otherwise keep the last hover.
 */
export const cursorPlugin: Plugin<'line'> = {
  id: 'cursor',
  // Runs before the tooltip handles the event, so its title reads this event's position
  beforeEvent(chart, { event, inChartArea }) {
    const { type, x, y } = event;
    cursors.set(chart, type !== 'mouseout' && inChartArea && x !== null && y !== null ? { x, y } : null);
  },
  afterEvent(chart, args) {
    const cursor = cursors.get(chart);
    if (!cursor && (chart.getActiveElements().length || chart.tooltip?.getActiveElements().length)) {
      hideCursor(chart);
    }
    // The tooltip was placed before it measured its new rows; place it again if their size flips it
    const { tooltip } = chart;
    if (cursor && tooltip?.getActiveElements().length) {
      const { xAlign, yAlign } = placeTooltip(cursor, tooltip, chart.chartArea);
      if (xAlign !== tooltip.xAlign || yAlign !== tooltip.yAlign) {
        // Tooltip#update isn't in the TooltipModel type; setActiveElements would also stop live replays updating it
        (tooltip as unknown as { update(changed: boolean, replay: boolean): void }).update(true, true);
        args.changed = true;
      }
    }
    if (cursor !== drawnCursors.get(chart)) args.changed = true;
  },
  afterDatasetsDraw(chart) {
    const cursor = cursors.get(chart) ?? null;
    drawnCursors.set(chart, cursor);
    // The zoom plugin swallows events mid-drag, so the cursor would be stuck where the drag began
    if (!cursor || chart.isZoomingOrPanning() || chart.data.datasets.every(({ data }) => !data.length)) return;
    const { ctx, chartArea } = chart;
    const x = Math.round(cursor.x) + 0.5;
    const y = Math.round(cursor.y) + 0.5;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = CURSOR_COLOR;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    // The horizontal line is fainter, as in uPlot, so it doesn't read as a value threshold
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(chartArea.left, y);
    ctx.lineTo(chartArea.right, y);
    ctx.stroke();
    // A dot where each hovered line crosses the cursor's time, in its series' color, ringed in the page background
    // so it stays visible on its own dense line
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.lineWidth = HOVER_DOT.borderWidth;
    ctx.strokeStyle = HOVER_DOT.borderColor;
    for (const { datasetIndex } of chart.getActiveElements()) {
      const point = lineAtPixel(chart, datasetIndex, cursor.x);
      if (!point) continue;
      ctx.fillStyle = chart.data.datasets[datasetIndex].borderColor as string;
      ctx.beginPath();
      ctx.arc(point.x, point.y, HOVER_DOT.radius, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  },
  beforeTooltipDraw: (chart) => !chart.isZoomingOrPanning()
};

const tooltipNumber = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });

function setCanvasCursor(event: ChartEvent, cursor: string): void {
  const target = event.native?.target;
  if (target instanceof HTMLElement) target.style.cursor = cursor;
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
    // Every series at the cursor's time (see nearestPerSeries), drawn with cursorPlugin's crosshair
    interaction: { mode: 'nearestPerSeries', intersect: false },
    // The x-axis reserves half of an edge tick's label as it arrives; fixed room keeps the plot from jumping
    layout: { padding: { right: 32, left: 8 } },
    elements: {
      // No sample dots, hovered or not: cursorPlugin draws the hover dot where the line crosses the cursor's time,
      // which is off the nearest sample between samples
      point: { radius: 0, hoverRadius: 0 },
      line: { borderWidth: 3, tension: 0 }
    },
    scales: {
      // Epoch-ms on a linear scale, with ticks replaced by clock-aligned ones (see buildTimeTicks)
      x: {
        type: 'linear',
        // Hidden until there is data, rather than labelled 00:00:00.000 to 00:00:00.001 (see syncChart)
        display: false,
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
        labels: { color: '#fff', font: { size: 15 } },
        // The canvas is a crosshair for zooming (graph.component.css); a legend item toggles its series
        onHover: (event) => setCanvasCursor(event, 'pointer'),
        onLeave: (event) => setCanvasCursor(event, '')
      },
      // Styled like uPlot's: dark grey, small type, a round swatch per series, below-right of the cursor
      tooltip: {
        enabled: true,
        position: 'cursor',
        backgroundColor: 'rgba(30, 30, 30, 0.92)',
        borderColor: '#555',
        borderWidth: 1,
        cornerRadius: 4,
        caretSize: 0,
        caretPadding: 0,
        padding: { x: 8, y: 6 },
        titleFont: { size: 12, weight: 'normal' },
        titleMarginBottom: 2,
        bodyFont: { size: 12 },
        bodySpacing: 2,
        usePointStyle: true,
        boxWidth: 8,
        boxHeight: 8,
        boxPadding: 4,
        callbacks: {
          // The time under the cursor, which each row's sample is nearest
          title: (items) => {
            const [first] = items;
            if (!first) return '';
            const { chart } = first;
            const { min, max } = chart.scales['x'];
            const cursor = cursors.get(chart);
            const time = cursor ? chart.scales['x'].getValueForPixel(cursor.x) : first.parsed.x;
            return formatTooltipTime(time ?? 0, max - min);
          },
          // The line's value at the cursor's time, where its hover dot sits
          label: (item) => {
            const value = lineAtCursor(item.chart, item.datasetIndex)?.value.y ?? item.parsed.y;
            return `${item.dataset.label}: ${tooltipNumber.format(value ?? NaN)}`;
          },
          labelPointStyle: () => ({ pointStyle: 'circle', rotation: 0 }),
          labelColor: ({ dataset }) => ({
            borderColor: dataset.borderColor as string,
            backgroundColor: dataset.borderColor as string
          })
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
          // The data under the cursor moved, so the hover is stale until the pointer moves again
          onZoomComplete: ({ chart }) => {
            hideCursor(chart);
            callbacks.onZoom();
          }
        },
        pan: {
          enabled: true,
          mode: 'x',
          modifierKey: 'shift',
          onPanComplete: ({ chart }) => {
            hideCursor(chart);
            callbacks.onZoom();
          }
        },
        // Bounds drag, ctrl-wheel and pinch zoom alike
        limits: { x: { minRange: 1000 } }
      },
      annotation: { annotations: [] }
    }
  };
}

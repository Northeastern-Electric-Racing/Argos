import type {
  Chart,
  ChartArea,
  ChartDataset,
  ChartEvent,
  ChartOptions,
  ChartType,
  InteractionModeFunction,
  Plugin,
  TooltipPosition,
  TooltipPositionerFunction
} from 'chart.js';
import { getRelativePosition } from 'chart.js/helpers';
import { GraphData } from 'src/utils/types.utils';

/**
 * ApexCharts' default palette first, so series keep the colors users are used to, then five more that read on
 * the dark background, so a sixth topic doesn't repeat the first one's color. ApexCharts' violet #775DD0 is
 * lightened to #9B87F5: as multi-axis tick text it was 3.8:1 on the page background, under WCAG AA's 4.5:1.
 */
export const SERIES_COLORS = [
  '#008FFB', // blue
  '#00E396', // green
  '#FEB019', // amber
  '#FF4560', // red
  '#9B87F5', // violet
  '#00D9E9', // cyan
  '#FF66C3', // pink
  '#C7F464', // lime
  '#F86624', // orange
  '#A5978B' // taupe
];

const TICK_COLOR = '#fff'; // white
const GRID_COLOR = 'rgba(255, 255, 255, 0.1)'; // white at 10%, faint on the dark page
/** The app's light-blue outline, as on its toolbar buttons; marks each local midnight on the x-axis. */
const THEME_OUTLINE = '#8fcadd'; // light blue

type ScaleConfig = NonNullable<ChartOptions<'line'>['scales']>[string];

/** A series' name for people: a single-value topic's series is "<topic> 0", so it goes by the topic alone. */
function seriesTitle(key: string): string {
  return key.replace(/ 0$/, '');
}

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
        text: seriesTitle(key),
        color: colors[index] ?? 'grey',
        font: { size: 20, weight: 'bold' }
      }
    };
  });
  return scales;
}

/** A CSV field, quoted when it holds a comma, a quote or a line break. */
const csvField = (value: string): string => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/**
 * A text CSV field, with a leading ' when it starts like a spreadsheet formula (OWASP's CSV injection advice).
 * Values are numbers, written as they are, so negative ones stay numbers.
 */
const csvText = (value: string): string => csvField(/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);

/**
 * The graph's data as CSV: an ISO 8601 UTC `time` column, then one column per series, headed by its seriesTitle.
 * Topics sample on their own clocks, so rows are the series' timestamps merged in order, with a blank cell where a
 * series has no sample.
 */
export function buildCsv(data: ReadonlyMap<string, readonly GraphData[]>): string {
  const series = Array.from(data.values());
  const lines = [['time', ...Array.from(data.keys(), seriesTitle)].map(csvText).join(',')];
  // A k-way merge of the sorted series: each row takes the next sample of every series at the earliest time left
  const next = series.map(() => 0);
  for (;;) {
    let time = Infinity;
    series.forEach((points, i) => (time = Math.min(time, points[next[i]]?.x ?? Infinity)));
    if (time === Infinity) break;
    const cells = series.map((points, i) => (points[next[i]]?.x === time ? String(points[next[i]++].y) : ''));
    lines.push([new Date(time).toISOString(), ...cells].join(','));
  }
  return lines.join('\r\n') + '\r\n';
}

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MAX_X_TICKS = 6;
/** Day steps stretch to 8 intervals, so every midnight of a week's range (an hour longer across DST's end) is a tick. */
const MAX_DAY_TICKS = 8;
/** The narrowest x window: a lone point gets this much axis, and zooming stops here. */
export const MIN_X_RANGE_MS = SECOND_MS;

const TIME_STEPS_MS = [
  ...[1, 2, 5, 10, 20, 50, 100, 200, 500],
  ...[1, 2, 5, 10, 15, 30].map((n) => n * SECOND_MS),
  ...[1, 2, 5, 10, 15, 30].map((n) => n * MINUTE_MS),
  ...[1, 2, 3, 6, 12].map((n) => n * HOUR_MS)
];

/**
 * The smallest clock-friendly step that fits the span in at most `maxTicks` intervals, or whole days in at most
 * MAX_DAY_TICKS, so that ticks keep landing on every midnight.
 */
export function pickTimeStep(spanMs: number, maxTicks = MAX_X_TICKS): number {
  return (
    TIME_STEPS_MS.find((step) => spanMs / step <= maxTicks) ??
    Math.max(1, Math.ceil(spanMs / MAX_DAY_TICKS / DAY_MS)) * DAY_MS
  );
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
  date: new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' })
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
const TOOLTIP_ROW_LABELS = { seconds: TIME_LABELS.seconds, millis: TIME_LABELS.millis };

/**
 * A tooltip time: the sample's date and 24-hour time, to the millisecond once the x ticks are sub-second; without
 * the date for a row's own time.
 */
export function formatTooltipTime(value: number, axisSpanMs: number, withDate = true): string {
  const labels = withDate ? TOOLTIP_LABELS : TOOLTIP_ROW_LABELS;
  return (pickTimeStep(axisSpanMs) < SECOND_MS ? labels.millis : labels.seconds).format(value);
}

const TOOLTIP_DATE = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });

/** A tooltip's date, as the title shows it. */
export function formatTooltipDate(value: number): string {
  return TOOLTIP_DATE.format(value);
}

/** A row's own sample time; carries its date too when that is not the title's day, so no point loses its day. */
export function formatRowTime(value: number, titleValue: number, axisSpanMs: number): string {
  const sameDay = formatTooltipDate(value) === formatTooltipDate(titleValue);
  return formatTooltipTime(value, axisSpanMs, !sameDay);
}

/** An x tick label as precise as the step needs; a local midnight shows its date instead. */
export function formatTimeTick(value: number, stepMs: number): string {
  if (isLocalMidnight(value)) return TIME_LABELS.date.format(value);
  if (stepMs < SECOND_MS) return TIME_LABELS.millis.format(value);
  if (stepMs < MINUTE_MS) return TIME_LABELS.seconds.format(value);
  return TIME_LABELS.minutes.format(value);
}

function isLocalMidnight(t: number): boolean {
  return new Date(t).setHours(0, 0, 0, 0) === t;
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

/** How far, in pixels, from a series' sample the pointer still hovers it, however short the series' period. */
const HOVER_SNAP_PX = 8;
/** How many of a series' sample periods from its nearest sample the pointer still hovers it (see hoverSample). */
export const HOVER_REACH_PERIODS = 2;

/** The median interval between a series' samples around index `i`, up to 8 either side; 0 for a lone sample. */
function typicalPeriod(points: readonly { x: number }[], i: number): number {
  const intervals: number[] = [];
  for (let j = Math.max(1, i - 8); j <= Math.min(points.length - 1, i + 8); j++) {
    intervals.push(points[j].x - points[j - 1].x);
  }
  intervals.sort((a, b) => a - b);
  return intervals[intervals.length >> 1] ?? 0;
}

/**
 * The real sample hover shows for a series at time `x`: its nearest, while that is within HOVER_REACH_PERIODS of the
 * series' typical period around it (or `snap`, if wider). Along steady data the nearest sample is always in reach;
 * in a gap over twice that long, and well past either end, the series has nothing to show and hover leaves it out.
 */
export function hoverSample(points: readonly GraphData[], x: number, snap = 0): GraphData | null {
  const i = nearestIndex(points, x);
  if (i < 0) return null;
  const reach = Math.max(snap, HOVER_REACH_PERIODS * typicalPeriod(points, i));
  return Math.abs(points[i].x - x) <= reach ? points[i] : null;
}

/** A series' dataset, carrying its full-resolution samples: decimation swaps `data` for the points it draws. */
export type SeriesDataset = ChartDataset<'line', GraphData[]> & { samples?: GraphData[] };

function samplesOf(chart: Chart, datasetIndex: number): GraphData[] {
  const dataset = chart.data.datasets[datasetIndex] as unknown as SeriesDataset;
  return dataset.samples ?? dataset.data;
}

/** A hovered sample, in data units and canvas pixels. */
type HoveredSample = { value: GraphData; x: number; y: number };

/**
 * The sample a dataset shows at a canvas x, or null where it has none (see hoverSample). Its pixel is on the drawn
 * line: a vertex, or, when decimated, inside the min-max stroke of its pixel column.
 */
function sampleAtPixel(chart: Chart, datasetIndex: number, px: number): HoveredSample | null {
  const xScale = chart.scales['x'];
  const time = xScale.getValueForPixel(px);
  if (time === undefined) return null;
  const snap = (HOVER_SNAP_PX * (xScale.max - xScale.min)) / (xScale.width || 1);
  const value = hoverSample(samplesOf(chart, datasetIndex), time, snap);
  if (!value) return null;
  const yScale = chart.scales[chart.getDatasetMeta(datasetIndex).yAxisID ?? 'y'];
  return { value, x: xScale.getPixelForValue(value.x), y: yScale.getPixelForValue(value.y) };
}

/**
 * Interaction mode (registered as `nearestPerSeries`): every visible series with a sample near the cursor's time, as
 * uPlot's cursor does. Built-in `index` mode assumes every series shares timestamps, which topics don't. Each item
 * carries the drawn element nearest that sample, which Chart.js needs; the hover dot and the tooltip row come from
 * the sample itself (see cursorPlugin and the tooltip's callbacks).
 */
export const nearestPerSeries: InteractionModeFunction = (chart, event) => {
  const position = getRelativePosition(event, chart);
  if (!chart.isPointInArea(position)) return [];
  return chart.getSortedVisibleDatasetMetas().flatMap(({ index: datasetIndex, data: elements }) => {
    const sample = sampleAtPixel(chart, datasetIndex, position.x);
    if (!sample) return [];
    // Points pushed since the last frame have no element yet; the newest drawn one stands in for them
    const drawn = chart.data.datasets[datasetIndex].data as { x: number }[];
    const index = Math.min(nearestIndex(drawn, sample.value.x), elements.length - 1);
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

/** Of every visible series' hovered sample, the one nearest the pointer's time (the first series' on a tie). */
function nearestHoveredSample(chart: Chart): GraphData | null {
  const cursor = cursors.get(chart);
  if (!cursor) return null;
  const time = chart.scales['x'].getValueForPixel(cursor.x);
  if (time === undefined) return null;
  let nearest: GraphData | null = null;
  for (const { index } of chart.getSortedVisibleDatasetMetas()) {
    const sample = sampleAtPixel(chart, index, cursor.x)?.value;
    if (sample && (!nearest || Math.abs(sample.x - time) < Math.abs(nearest.x - time))) nearest = sample;
  }
  return nearest;
}

/** Hides the cursor lines, dots and tooltip until the pointer next moves, e.g. after a zoom moved the data under it. */
function hideCursor(chart: Chart): void {
  // The zoom plugin calls onZoomComplete 250 ms after a wheel zoom, by when the chart may have been destroyed
  if (!(chart.ctx as CanvasRenderingContext2D | null)) return;
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
        // Tooltip#update isn't in the TooltipModel type (checked against Chart.js 4.5.1); setActiveElements would also
        // stop live replays updating it
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
    // A dot on each hovered sample, in its series' color, ringed in the page background so it stays visible on its
    // own dense line
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.lineWidth = HOVER_DOT.borderWidth;
    ctx.strokeStyle = HOVER_DOT.borderColor;
    for (const { datasetIndex } of chart.getActiveElements()) {
      const point = sampleAtPixel(chart, datasetIndex, cursor.x);
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

/** Base options for the graph page's line chart. The y scales and the x window are filled in per frame. */
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
    // Every series' sample nearest the cursor's time (see nearestPerSeries), drawn with cursorPlugin's crosshair
    interaction: { mode: 'nearestPerSeries', intersect: false },
    // The x-axis reserves half of an edge tick's label as it arrives; fixed room keeps the plot from jumping
    layout: { padding: { right: 32, left: 8 } },
    elements: {
      // No sample dots, hovered or not: cursorPlugin draws the hover dot on the hovered sample, which with
      // decimation needn't be a drawn point
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
          // Midnights are major ticks: autoSkip keeps them, and they get the day boundary's grid line
          scale.ticks = buildTimeTicks(scale.min, scale.max).map((value) => ({ value, major: isLocalMidnight(value) }));
        },
        ticks: {
          color: TICK_COLOR,
          maxRotation: 0,
          major: { enabled: true },
          callback(value) {
            return formatTimeTick(+value, pickTimeStep(this.max - this.min));
          }
        },
        grid: { color: ({ tick }) => (tick?.major ? THEME_OUTLINE : GRID_COLOR) }
      },
      ...buildYScales([], false, { yMin: null, yMax: null })
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#fff', font: { size: 15 }, usePointStyle: true, boxWidth: 12, boxHeight: 12 },
        // The canvas is a crosshair for zooming (graph.component.css); a legend item toggles its series
        onHover: (event) => setCanvasCursor(event, 'pointer'),
        onLeave: (event) => setCanvasCursor(event, '')
      },
      // Styled like uPlot's: dark grey, a round swatch per series, below-right of the cursor
      tooltip: {
        enabled: true,
        position: 'cursor',
        backgroundColor: 'rgba(30, 30, 30, 0.92)',
        borderColor: '#555',
        borderWidth: 1,
        cornerRadius: 4,
        caretSize: 0,
        caretPadding: 0,
        padding: { x: 10, y: 8 },
        titleFont: { size: 16, weight: 'normal' },
        titleMarginBottom: 4,
        bodyFont: { size: 16 },
        bodySpacing: 3,
        usePointStyle: true,
        boxWidth: 12,
        boxHeight: 12,
        boxPadding: 4,
        callbacks: {
          // The date of the sample nearest the pointer; each row carries its own time (see label)
          title: (items) => {
            const [first] = items;
            if (!first) return '';
            return formatTooltipDate(nearestHoveredSample(first.chart)?.x ?? first.parsed.x ?? 0);
          },
          // The series' hovered sample, where its hover dot sits, and when it was taken
          label: (item) => {
            const { chart } = item;
            const cursor = cursors.get(chart);
            const sample = cursor && sampleAtPixel(chart, item.datasetIndex, cursor.x)?.value;
            const row = `${item.dataset.label}: ${tooltipNumber.format(sample?.y ?? item.parsed.y ?? NaN)}`;
            const titleTime = nearestHoveredSample(chart)?.x;
            if (!sample || titleTime === undefined) return row;
            const span = chart.scales['x'].max - chart.scales['x'].min;
            return `${row} (${formatRowTime(sample.x, titleTime, span)})`;
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
          // As each zoom step lands, not on onZoomComplete: the plugin delays that 250 ms after a wheel and to the
          // end of a pinch, and live points arriving meanwhile would reset the x-window under the zoom
          onZoom: callbacks.onZoom,
          // The data under the cursor moved, so the hover is stale until the pointer moves again
          onZoomComplete: ({ chart }) => hideCursor(chart)
        },
        pan: {
          enabled: true,
          mode: 'x',
          modifierKey: 'shift',
          // At the start of the gesture, for the same reason as zoom's onZoom; returning false would reject the pan
          onPanStart: () => {
            callbacks.onZoom();
            return undefined;
          },
          onPanComplete: ({ chart }) => hideCursor(chart)
        },
        // Bounds drag, ctrl-wheel and pinch zoom alike
        limits: { x: { minRange: MIN_X_RANGE_MS } }
      }
    }
  };
}

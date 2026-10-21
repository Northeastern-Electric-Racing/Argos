import type { ComposeOption } from 'echarts/core';
import { binarySearchInsertIndex } from 'src/utils/array.utils';
import type { LineSeriesOption } from 'echarts/charts';
import type {
  DataZoomComponentOption,
  GridComponentOption,
  LegendComponentOption,
  MarkLineComponentOption,
  ToolboxComponentOption,
  TooltipComponentOption
} from 'echarts/components';

export type GraphChartOption = ComposeOption<
  | LineSeriesOption
  | GridComponentOption
  | TooltipComponentOption
  | LegendComponentOption
  | DataZoomComponentOption
  | ToolboxComponentOption
  | MarkLineComponentOption
>;
type XAxisOption = Exclude<NonNullable<GraphChartOption['xAxis']>, unknown[]>;
type YAxisOption = Exclude<NonNullable<GraphChartOption['yAxis']>, unknown[]>;

/** One datapoint as ECharts reads it: [time in ms, value]. */
export type Point = [x: number, y: number];

export const DAY_MS = 24 * 60 * 60 * 1000;
/** Id of the data-less series that carries the day-boundary mark lines. */
export const DAY_BOUNDARIES_ID = '__day-boundaries';
const TEXT_COLOR = '#fff';
/** The app's font (`--font-family`); ECharts draws on a canvas, so it can't inherit it from the page. */
const FONT_FAMILY = 'Roboto, sans-serif';
/**
 * Develop's ApexCharts series colours, each at least 3:1 against the page's #101010. ECharts' own palette has a
 * dark slate (#505372, 2.6:1) that all but disappears there.
 */
export const SERIES_COLORS = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0'];
const DAY_BOUNDARY_COLOR = '#8fcadd';
/** Id of the y-axis when all series share one. */
const SHARED_Y_AXIS_ID = 'shared';
/** Horizontal room each extra y-axis on the same side takes (labels + rotated name). */
const Y_AXIS_OFFSET_PX = 80;
const LEGEND_LEFT_PX = 16;
const LEGEND_PADDING_PX = 5;
const TOOLBOX_RIGHT_PX = 16;
const TOOLBOX_ICON_PX = 15;
const TOOLBOX_GAP_PX = 10;
/** Zoom, zoom reset, restore and save as image. */
const TOOLBOX_ICONS = 4;
/** How far from the chart's right edge the toolbox's left edge is, plus a gap before it. */
const TOOLBOX_RESERVE_PX = TOOLBOX_RIGHT_PX + TOOLBOX_ICONS * TOOLBOX_ICON_PX + (TOOLBOX_ICONS - 1) * TOOLBOX_GAP_PX + 24;

/** What the graph page knows when it redraws; everything the chart shows derives from it. */
export interface GraphChartState {
  /** Series label -> points, each sorted by x. */
  data: ReadonlyMap<string, readonly Point[]>;
  multipleYAxes: boolean;
  yMin: number | null;
  yMax: number | null;
  /** Width of the window ending at the newest point; undefined fits all data. */
  xRangeMs: number | undefined;
  /** Historical mode: date-aware labels and day-boundary lines when the data spans days. */
  detectMultiDay: boolean;
  /** The chart's width in px, which bounds the legend. */
  chartWidth: number;
}

/**
 * The options the chart is created with. Set once; live updates go through
 * {@link graphChartUpdate} so they merge into the chart instead of rebuilding it.
 */
export function baseGraphChartOption(): GraphChartOption {
  return {
    animation: false,
    backgroundColor: 'transparent',
    color: SERIES_COLORS,
    textStyle: { color: TEXT_COLOR, fontFamily: FONT_FAMILY },
    grid: { left: 16, right: 16, top: 56, bottom: 16 },
    legend: {
      type: 'scroll',
      top: 0,
      // Its width, which leaves the top-right corner to the toolbox, comes with each redraw: ECharts ignores a
      // legend's `right` when `left` is set, and a width that tracks the toolbox has to be in px
      left: LEGEND_LEFT_PX,
      padding: LEGEND_PADDING_PX,
      textStyle: { color: TEXT_COLOR, fontSize: 15 },
      pageTextStyle: { color: TEXT_COLOR }
    },
    tooltip: {
      trigger: 'axis',
      confine: true,
      transitionDuration: 0,
      axisPointer: { type: 'line', animation: false },
      formatter: tooltipFormatter,
      // An HTML tooltip doesn't take the global textStyle's font
      textStyle: { fontFamily: FONT_FAMILY }
    },
    toolbox: {
      right: TOOLBOX_RIGHT_PX,
      // Centres the icons on the legend's row, ending them at the plot's right edge
      padding: [2, 0],
      itemSize: TOOLBOX_ICON_PX,
      itemGap: TOOLBOX_GAP_PX,
      feature: {
        dataZoom: { yAxisIndex: 'none' },
        restore: {},
        saveAsImage: { backgroundColor: '#1e1e1e' }
      }
    },
    // Wheel/drag zoom on the time axis. 'filter' drops points outside the window, so the y-axis
    // rescales to what is visible (ApexCharts' autoScaleYaxis).
    dataZoom: [{ type: 'inside', xAxisIndex: 0, filterMode: 'filter' }],
    xAxis: {
      type: 'time',
      splitNumber: 6,
      splitLine: { show: true },
      axisLabel: { color: TEXT_COLOR, hideOverlap: true, formatter: singleDayLabel }
    },
    yAxis: [baseYAxis()],
    series: []
  };
}

/**
 * The partial option one redraw merges into the chart. Apply it with
 * `replaceMerge: ['series', 'yAxis']` so deselected topics drop their series and axes.
 */
export function graphChartUpdate(state: GraphChartState): GraphChartOption {
  const span = computeDataSpan(state.data);
  const isMultiDay = state.detectMultiDay && !!span && span.spanMs > DAY_MS;
  // With no topics (or right after a clear) there are no per-topic axes; keep one so the grid always has a y-axis,
  // which ECharts needs to lay out the x-axis and toolbox
  const multipleYAxes = state.multipleYAxes && state.data.size > 0;
  const yAxis = multipleYAxes
    ? buildMultiYAxes([...state.data.keys()])
    : [{ ...baseYAxis(), id: SHARED_Y_AXIS_ID, min: state.yMin ?? undefined, max: state.yMax ?? undefined }];
  // Whole ms: ECharts rounds a time axis's zoom window to them, and a fractional edge would filter out the edge point
  const windowStart = state.xRangeMs !== undefined && span ? Math.ceil(span.maxX - state.xRangeMs) : undefined;

  const series: LineSeriesOption[] = [...state.data].map(([name, points], index) => ({
    id: name,
    name,
    type: 'line',
    data: windowStart === undefined ? (points as Point[]) : clipToWindow(points, windowStart),
    yAxisIndex: multipleYAxes ? index : 0,
    showSymbol: false,
    lineStyle: { width: 3 },
    // Downsample to the canvas width, keeping peaks; matters for long historical ranges
    sampling: 'lttb',
    animation: false
  }));
  // Left out otherwise, so replaceMerge removes the lines of a range that no longer spans days
  if (isMultiDay) series.push(dayBoundarySeries(span!));
  return {
    legend: { width: Math.max(0, state.chartWidth - LEGEND_LEFT_PX - 2 * LEGEND_PADDING_PX - TOOLBOX_RESERVE_PX) },
    xAxis: {
      // null clears a previous window so the axis fits all data again
      min: windowStart ?? null,
      // With a fixed min, ECharts' time scale puts about twice as many labels on the axis, so halve it to keep about
      // 6 labels live, as paused and in historical mode
      splitNumber: windowStart === undefined ? 6 : 3,
      axisLabel: { formatter: isMultiDay ? multiDayLabel : singleDayLabel }
    } as XAxisOption,
    yAxis,
    series
  };
}

/** One y-axis per topic, alternating sides and stepping outward so stacked axes don't overlap. */
export function buildMultiYAxes(labels: string[]): YAxisOption[] {
  return labels.map((label, index) => ({
    ...baseYAxis(),
    // replaceMerge keeps an axis only when its id matches, so without one every redraw rebuilds every axis
    id: label,
    name: label.replace('0', ''),
    nameLocation: 'middle',
    nameGap: 50,
    nameTextStyle: { color: 'grey', fontSize: 20, fontWeight: 'bold' },
    position: index % 2 === 0 ? 'left' : 'right',
    offset: Math.floor(index / 2) * Y_AXIS_OFFSET_PX,
    // Only the first axis draws grid lines; one set per axis would cross-hatch the chart, so the others put their
    // ticks on its lines
    splitLine: { show: index === 0 },
    alignTicks: index > 0
  }));
}

/**
 * A live window's part of a series: the points from `windowStart` on, led by one interpolated onto `windowStart`
 * from the points either side of it. The zoom filter drops every point before the window, so the edge point is what
 * runs the line out to the edge (sliding smoothly as data ages out) while the y-axis fits only what is on screen.
 */
export function clipToWindow(points: readonly Point[], windowStart: number): Point[] {
  const first = binarySearchInsertIndex(points, windowStart, ([x]) => x);
  const visible = points.slice(first);
  if (first === 0 || first === points.length || points[first][0] === windowStart) return visible;
  const [x0, y0] = points[first - 1];
  const [x1, y1] = points[first];
  // Rounded like incoming values, so the tooltip at the edge shows no float noise
  const y = Math.round((y0 + ((y1 - y0) * (windowStart - x0)) / (x1 - x0)) * 10000) / 10000;
  return [[windowStart, y], ...visible];
}

/**
 * A data-less series carrying the day-boundary lines. A mark line belongs to its series, so on a topic's series
 * hiding that topic in the legend would hide the boundaries too. Unnamed, so the legend leaves it out.
 */
function dayBoundarySeries(span: { minX: number; maxX: number }): LineSeriesOption {
  return {
    id: DAY_BOUNDARIES_ID,
    type: 'line',
    data: [],
    markLine: buildDayBoundaryMarkLine(span),
    silent: true,
    tooltip: { show: false },
    animation: false
  };
}

export function computeDataSpan(
  data: ReadonlyMap<string, readonly Point[]>
): { minX: number; maxX: number; spanMs: number } | null {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const points of data.values()) {
    if (points.length === 0) continue;
    // Series data is kept sorted by x, so endpoints are the extrema.
    const [[first]] = points;
    const [last] = points[points.length - 1];
    if (first < minX) minX = first;
    if (last > maxX) maxX = last;
  }
  if (!isFinite(minX) || !isFinite(maxX)) return null;
  return { minX, maxX, spanMs: maxX - minX };
}

/** Dashed vertical lines at each local midnight inside the span, labelled with the new day. */
export function buildDayBoundaryMarkLine(span: { minX: number; maxX: number }): MarkLineComponentOption {
  const data: { xAxis: number; label: { formatter: string } }[] = [];
  // First local-midnight strictly after minX.
  const cursor = new Date(span.minX);
  cursor.setHours(24, 0, 0, 0);
  for (let t = cursor.getTime(); t < span.maxX; t += DAY_MS) {
    data.push({
      xAxis: t,
      label: {
        formatter: new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      }
    });
  }
  return {
    silent: true,
    animation: false,
    symbol: ['none', 'none'],
    lineStyle: { color: DAY_BOUNDARY_COLOR, type: 'dashed', width: 1 },
    label: {
      position: 'end',
      color: TEXT_COLOR,
      backgroundColor: '#0c2026',
      borderColor: DAY_BOUNDARY_COLOR,
      borderWidth: 1,
      padding: [2, 4],
      fontSize: 11
    },
    data
  };
}

export function singleDayLabel(val: number): string {
  return new Date(val).toLocaleTimeString('en-US', { hour12: false });
}

export function multiDayLabel(val: number): string {
  const d = new Date(val);
  const date = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
}

interface TooltipParam {
  marker?: unknown;
  seriesName?: string;
  value?: unknown;
}

/**
 * Hovered time, then the value of each series ECharts passes. On a time axis it passes only the series whose nearest
 * point is nearest the cursor, so a topic sampled at other times is left out, as in develop's `shared: false` tooltip.
 */
export function tooltipFormatter(params: TooltipParam | TooltipParam[]): string {
  const items = Array.isArray(params) ? params : [params];
  const first = items[0]?.value;
  if (!Array.isArray(first)) return '';
  const time = new Date(first[0] as number);
  const header =
    time.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' }) +
    ', ' +
    time.toLocaleTimeString('en-US', { hour12: false });
  const rows = items.map((item) => {
    const value = Array.isArray(item.value) ? item.value[1] : item.value;
    return `${item.marker ?? ''}${escapeHtml(item.seriesName ?? '')}: <b>${escapeHtml(String(value))}</b>`;
  });
  return [escapeHtml(header), ...rows].join('<br/>');
}

function baseYAxis(): YAxisOption {
  return {
    type: 'value',
    // Fit the data instead of always including zero
    scale: true,
    axisLabel: { color: TEXT_COLOR }
  };
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

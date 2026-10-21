import type { Annotations, Layout, LayoutAxis, PlotData, Shape } from 'plotly.js';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** One line's points as columns, sorted by x. The plot's trace shares these arrays, so nothing is copied per frame. */
export interface Series {
  x: number[];
  y: number[];
}

export interface DataSpan {
  minX: number;
  maxX: number;
  spanMs: number;
}

export interface LayoutOptions {
  seriesNames: string[];
  multipleYAxes: boolean;
  yMin: number | null;
  yMax: number | null;
  /** Visible x window; undefined autoranges to all data. */
  xRange?: [number, number];
  /** Historical data span, for multi-day labels and day boundaries; null in real-time mode. */
  span: DataSpan | null;
  /** Kept while the topics stay the same, so a user's zoom survives updates. */
  uiRevision: number;
  /** Bumped to drop a user's y zoom alone (on pause and resume), keeping legend toggles and x zoom. */
  yRevision: number;
  /**
   * Live and unpaused: each frame moves the x window, which would undo an x zoom at once while
   * keeping its y half, so x is fixed and a drag zooms y only. Pause to zoom x.
   */
  followLive?: boolean;
  /** Bumped every frame: the series arrays are mutated in place, so Plotly.react needs this to recalc them. */
  dataRevision: number;
}

/** autoshift (plotly.js 2.20+) is missing from @types/plotly.js. */
export type YAxis = Partial<LayoutAxis> & { autoshift?: boolean };

const TEXT_COLOR = '#fff';
const GRID_COLOR = 'rgba(255, 255, 255, 0.1)';
const BOUNDARY_COLOR = '#8fcadd';
const FONT_FAMILY = 'Roboto, sans-serif';

/** Plotly's default colorway, set explicitly so each per-topic y-axis can take its line's colour. */
export const SERIES_COLORS = [
  '#1f77b4',
  '#ff7f0e',
  '#2ca02c',
  '#d62728',
  '#9467bd',
  '#8c564b',
  '#e377c2',
  '#7f7f7f',
  '#bcbd22',
  '#17becf'
];

/**
 * Plotly date axes take epoch ms as UTC and have no time-zone setting, so x values are shifted
 * to local wall-clock time before plotting; ticks and hover labels then read as local time.
 */
export const toWallClockMs = (ms: number): number => ms - new Date(ms).getTimezoneOffset() * 60_000;

const axisRef = (index: number) => (index === 0 ? 'y' : `y${index + 1}`);
const axisKey = (index: number) => (index === 0 ? 'yaxis' : `yaxis${index + 1}`);

export function buildTraces(data: Map<string, Series>, multipleYAxes: boolean): Partial<PlotData>[] {
  return Array.from(data, ([name, series], index) => ({
    type: 'scattergl',
    mode: 'lines',
    name,
    x: series.x,
    y: series.y,
    yaxis: multipleYAxes ? axisRef(index) : 'y',
    // The name in every hover row: unified hover leaves it out when only one series is drawn.
    hovertemplate: '%{fullData.name}: %{y}<extra></extra>',
    line: { width: 3 }
  }));
}

export function computeDataSpan(data: Map<string, Series>): DataSpan | null {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const { x } of data.values()) {
    if (x.length === 0) continue;
    // Series are kept sorted by x, so the endpoints are the extrema.
    const [first] = x;
    const last = x[x.length - 1];
    if (first < minX) minX = first;
    if (last > maxX) maxX = last;
  }
  if (!isFinite(minX) || !isFinite(maxX)) return null;
  return { minX, maxX, spanMs: maxX - minX };
}

/** Latest x across all series, the right edge of the live window. */
export function latestX(data: Map<string, Series>): number | null {
  let max = -Infinity;
  for (const { x } of data.values()) {
    if (x.length > 0 && x[x.length - 1] > max) max = x[x.length - 1];
  }
  return isFinite(max) ? max : null;
}

/**
 * Applies the user's y bounds; a missing bound autoranges that end only. One bound goes through
 * autorangeoptions, not a partial range with autorange 'min'/'max': Plotly.react ignores a switch
 * from autorange true to 'min'/'max' while uirevision is unchanged, so a lone Y Min never showed.
 */
function boundedAxis(yMin: number | null, yMax: number | null): Partial<LayoutAxis> {
  if (yMin !== null && yMax !== null) return { autorange: false, range: [yMin, yMax] };
  if (yMin !== null) return { autorange: true, autorangeoptions: { minallowed: yMin } };
  if (yMax !== null) return { autorange: true, autorangeoptions: { maxallowed: yMax } };
  return { autorange: true };
}

/**
 * One y-axis per series, alternating left and right, coloured like its line. The first sits on the
 * plot's edge; the rest are free axes that autoshift outward past their side's earlier axes (ticks
 * and title included), and automargin grows the margins to fit them.
 *
 * Every axis autoranges explicitly: otherwise Plotly.react, under an unchanged uirevision, puts the
 * last drawn range back and turns autorange off, freezing the first axis at a stale or empty range.
 * The stacked axes take their own round ticks ('auto'), not Plotly's default for overlaying axes
 * ('sync'), whose values like 61.913 change width every frame and shift the plot sideways.
 */
export function buildMultiYAxes(names: string[]): Record<string, YAxis> {
  const axes: Record<string, YAxis> = {};
  names.forEach((name, index) => {
    const side = index % 2 === 0 ? 'left' : 'right';
    const color = SERIES_COLORS[index % SERIES_COLORS.length];
    axes[axisKey(index)] = {
      // A single-value topic's label ends in its value index " 0"; the title drops it.
      title: { text: name.replace(/ 0$/, ''), font: { color, size: 13 } },
      color,
      gridcolor: GRID_COLOR,
      zerolinecolor: GRID_COLOR,
      showgrid: index === 0,
      autorange: true,
      side,
      automargin: true,
      ...(index === 0
        ? {}
        : { overlaying: 'y', anchor: 'free', autoshift: true, position: side === 'left' ? 0 : 1, tickmode: 'auto' })
    };
  });
  return axes;
}

/** A dashed line and a date label at each local midnight inside the span (x is wall-clock ms). */
export function buildDayBoundaries(span: { minX: number; maxX: number }): {
  shapes: Partial<Shape>[];
  annotations: Partial<Annotations>[];
} {
  const shapes: Partial<Shape>[] = [];
  const annotations: Partial<Annotations>[] = [];
  // Wall-clock ms puts local midnights on multiples of DAY_MS; start at the first one after minX.
  for (let t = Math.floor(span.minX / DAY_MS) * DAY_MS + DAY_MS; t < span.maxX; t += DAY_MS) {
    shapes.push({
      type: 'line',
      xref: 'x',
      yref: 'paper',
      x0: t,
      x1: t,
      y0: 0,
      y1: 1,
      line: { color: BOUNDARY_COLOR, dash: 'dash', width: 1 }
    });
    annotations.push({
      x: t,
      xref: 'x',
      y: 1,
      yref: 'paper',
      yanchor: 'bottom',
      showarrow: false,
      text: new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
      font: { color: TEXT_COLOR, size: 11 },
      bgcolor: '#0c2026',
      bordercolor: BOUNDARY_COLOR
    });
  }
  return { shapes, annotations };
}

/** An axis uirevision overrides the layout's, so it carries the topics' revision too. */
function withUiRevision(axes: Record<string, YAxis>, uirevision: string): Record<string, YAxis> {
  return Object.fromEntries(Object.entries(axes).map(([key, axis]) => [key, { ...axis, uirevision }]));
}

export function buildLayout(options: LayoutOptions): Partial<Layout> {
  const isMultiDay = !!options.span && options.span.spanMs > DAY_MS;
  const multi = options.multipleYAxes && options.seriesNames.length > 0 ? buildMultiYAxes(options.seriesNames) : null;
  const boundaries = isMultiDay ? buildDayBoundaries(options.span!) : { shapes: [], annotations: [] };
  // An empty plot's axes span placeholder ranges (a year of identical "00:00:00" ticks, -1 to 4).
  const empty = options.seriesNames.length === 0;

  return {
    autosize: true,
    paper_bgcolor: 'rgba(0, 0, 0, 0)',
    plot_bgcolor: 'rgba(0, 0, 0, 0)',
    font: { color: TEXT_COLOR, family: FONT_FAMILY },
    colorway: SERIES_COLORS,
    margin: { l: 60, r: 30, t: 30, b: 40 },
    // One box at the cursor's time: a time header, then each series' nearest point by x, named and
    // colour-keyed. hoverdistance -1 drops the distance cutoff, like ApexCharts' non-intersecting tooltip.
    hovermode: 'x unified',
    hoverdistance: -1,
    // namelength -1: full topic names, not Plotly's 15-character cut.
    hoverlabel: { bgcolor: '#1e1e1e', font: { color: TEXT_COLOR }, namelength: -1 },
    dragmode: 'zoom',
    legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.1, yanchor: 'top', font: { color: TEXT_COLOR, size: 15 } },
    uirevision: options.uiRevision,
    datarevision: options.dataRevision,
    xaxis: {
      type: 'date',
      nticks: 7,
      color: TEXT_COLOR,
      gridcolor: GRID_COLOR,
      zerolinecolor: GRID_COLOR,
      showticklabels: !empty,
      tickformat: isMultiDay ? '%-m/%-d %H:%M' : '%H:%M:%S',
      hoverformat: '%-m/%-d/%y, %H:%M:%S',
      fixedrange: !!options.followLive,
      ...(options.xRange ? { autorange: false, range: options.xRange } : { autorange: true })
    },
    ...withUiRevision(
      multi ?? {
        yaxis: {
          color: TEXT_COLOR,
          gridcolor: GRID_COLOR,
          zerolinecolor: GRID_COLOR,
          zeroline: !empty,
          showticklabels: !empty,
          automargin: true,
          ...boundedAxis(options.yMin, options.yMax)
        }
      },
      `${options.uiRevision}.${options.yRevision}`
    ),
    shapes: boundaries.shapes,
    annotations: boundaries.annotations
  };
}

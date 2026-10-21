import uPlot from 'uplot';
import { UplotChartOptions } from 'src/components/uplot-chart/uplot-chart.component';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** ApexCharts' default palette, so topics keep the colors they had before the move to uPlot. */
export const SERIES_COLORS = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0'];

/** Color of the topic at `index` (0-based over the topics). */
const seriesColor = (index: number) => SERIES_COLORS[index % SERIES_COLORS.length];

const AXIS_COLOR = '#fff';
const GRID_COLOR = 'rgba(255, 255, 255, 0.12)';
const DAY_BOUNDARY_COLOR = '#8fcadd';
const DAY_LABEL_BACKGROUND = '#0c2026';
/** The app's font (styles.css `--font-family`), for what uPlot draws on its canvas. */
const FONT_FAMILY = 'Roboto, sans-serif';
const AXIS_FONT = `12px ${FONT_FAMILY}`;

/**
 * One topic's points as two columns, sorted by x: plain number arrays, so a point costs two unboxed doubles
 * instead of an object, and a single topic is already in uPlot's aligned-data shape.
 */
export interface SeriesColumns {
  xs: number[];
  ys: number[];
}

/**
 * Merges each series (each sorted by x) onto one shared, sorted x array: uPlot's aligned-data shape.
 * A series with no point at an x gets `undefined` there, which uPlot treats as an alignment gap:
 * `spanGaps` draws the line across it and the hover cursor skips it to the series' nearest real point.
 * A single series is passed through without a copy. Otherwise a k-way merge, O(points x series),
 * so it stays cheap enough to run once per animation frame.
 */
export function alignSeries(series: SeriesColumns[]): uPlot.AlignedData {
  if (series.length === 1) return [series[0].xs, series[0].ys];

  const cursors = series.map(() => 0);
  const xs: number[] = [];
  const ys: (number | undefined)[][] = series.map(() => []);

  for (;;) {
    let nextX = Infinity;
    for (let s = 0; s < series.length; s++) {
      const x = series[s].xs[cursors[s]];
      if (x !== undefined && x < nextX) nextX = x;
    }
    if (nextX === Infinity) break;

    xs.push(nextX);
    for (let s = 0; s < series.length; s++) {
      const i = cursors[s];
      if (series[s].xs[i] === nextX) {
        ys[s].push(series[s].ys[i]);
        cursors[s]++;
      } else {
        ys[s].push(undefined);
      }
    }
  }

  return [xs, ...ys];
}

/** The x extent of every series (each sorted by x), or null when there are no points. */
export function dataSpan(series: SeriesColumns[]): { minX: number; maxX: number; spanMs: number } | null {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const { xs } of series) {
    if (xs.length === 0) continue;
    const [first] = xs;
    if (first < minX) minX = first;
    if (xs[xs.length - 1] > maxX) maxX = xs[xs.length - 1];
  }
  if (!isFinite(minX) || !isFinite(maxX)) return null;
  return { minX, maxX, spanMs: maxX - minX };
}

/** Local midnights strictly after `minX` and before `maxX`. */
export function dayBoundaries(minX: number, maxX: number): number[] {
  const boundaries: number[] = [];
  // Step by calendar day, not 24 h: a DST change makes a day 23 or 25 h long.
  const cursor = new Date(minX);
  for (cursor.setHours(24, 0, 0, 0); cursor.getTime() < maxX; cursor.setHours(24, 0, 0, 0)) {
    boundaries.push(cursor.getTime());
  }
  return boundaries;
}

// develop's x-axis label formats, as uPlot's precompiled date templates: cheaper per tick than Intl.
// uPlot's own time-axis table only has 12 h formats.
const formatSingleDay = uPlot.fmtDate('{HH}:{mm}:{ss}');
const formatMultiDay = uPlot.fmtDate('{M}/{D} {HH}:{mm}');

export const singleDayLabel = (ms: number): string => formatSingleDay(new Date(ms));

export const multiDayLabel = (ms: number): string => formatMultiDay(new Date(ms));

const tooltipTimeLabel = (ms: number): string =>
  new Date(ms).toLocaleString('en-US', {
    year: '2-digit',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
/**
 * x tick steps: whole seconds at the finest, since the labels show seconds (uPlot's sub-second steps printed
 * each second twice), and a 2-minute step uPlot lacks, so 10-20 minute spans get more than 2-3 labels.
 */
const X_INCRS = [
  SECOND,
  2 * SECOND,
  5 * SECOND,
  10 * SECOND,
  15 * SECOND,
  30 * SECOND,
  MINUTE,
  2 * MINUTE,
  5 * MINUTE,
  10 * MINUTE,
  15 * MINUTE,
  30 * MINUTE,
  HOUR,
  2 * HOUR,
  3 * HOUR,
  4 * HOUR,
  6 * HOUR,
  8 * HOUR,
  12 * HOUR,
  DAY_MS,
  2 * DAY_MS,
  3 * DAY_MS,
  7 * DAY_MS,
  14 * DAY_MS
];

const tooltipNumber = new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 });

/** Context for measuring axis labels, apart from uPlot's own so its cached canvas font state stays right. */
let measureContext: CanvasRenderingContext2D | null = null;

/**
 * A y-axis `size` that fits the widest tick label, so labels like "45,000" are not clipped at uPlot's fixed 50 px.
 * It grows in 10 px steps and never shrinks within a chart, so live labels changing width don't shift the plot.
 */
export function growingAxisSize(
  minSize = 50,
  step = 10
): (u: uPlot, values: string[], axisIdx: number, cycleNum: number) => number {
  let size = minSize;
  return (u, values, axisIdx) => {
    if (!values?.length) return size;
    const axis = u.axes[axisIdx];
    measureContext ??= document.createElement('canvas').getContext('2d');
    if (!measureContext) return size;
    // uPlot keeps an initialized axis's font as [css font scaled by pxRatio, size]
    measureContext.font = (axis.font as unknown as [string, number] | undefined)?.[0] ?? AXIS_FONT;
    let widest = 0;
    for (const value of values) widest = Math.max(widest, measureContext.measureText(value).width);
    const needed = (axis.ticks?.size ?? 10) + (axis.gap ?? 5) + widest / uPlot.pxRatio;
    size = Math.max(size, Math.ceil(needed / step) * step);
    return size;
  };
}

/** Puts the grid on the first y-axis whose series is shown, so hiding that series doesn't leave the grid on a hidden axis. */
export function showGridOnFirstVisibleAxis(u: uPlot): void {
  let gridShown = false;
  for (let i = 1; i < u.axes.length; i++) {
    const { grid } = u.axes[i];
    if (!grid) continue;
    grid.show = !gridShown && !!u.series[i]?.show;
    if (grid.show) gridShown = true;
  }
}

/**
 * Where the tooltip goes: below-right of the cursor, flipped to its other side near the right/bottom edges,
 * then kept inside the plot when it fits on neither side (it would cover the axes or be cut off).
 */
export function placeTooltip(
  left: number,
  top: number,
  width: number,
  height: number,
  plotWidth: number,
  plotHeight: number
): { x: number; y: number } {
  const x = left + width + 16 > plotWidth ? left - width - 12 : left + 12;
  const y = top + height + 16 > plotHeight ? top - height - 12 : top + 12;
  return {
    x: Math.max(0, Math.min(x, plotWidth - width)),
    y: Math.max(0, Math.min(y, plotHeight - height))
  };
}

/** Scale key of the series at `index` (0-based over the topics, not counting uPlot's x series). */
const yScaleKey = (index: number, multipleYAxes: boolean) => (multipleYAxes ? `y${index}` : 'y');

/**
 * The y-axes for the current topics: one shared axis, or one per topic with alternating sides so stacked axes
 * stay readable. Built from the current series keys every time they change, so deselecting a topic prunes its axis (#630).
 */
export function buildYAxes(keys: string[], multipleYAxes: boolean): uPlot.Axis[] {
  const base = (): uPlot.Axis => ({
    stroke: AXIS_COLOR,
    font: AXIS_FONT,
    grid: { stroke: GRID_COLOR },
    ticks: { stroke: GRID_COLOR },
    space: 50,
    // a sizer per axis, since each one remembers how wide it has grown
    size: growingAxisSize()
  });
  if (!multipleYAxes) return [{ ...base(), scale: 'y' }];

  return keys.map((key, index) => ({
    ...base(),
    scale: yScaleKey(index, true),
    // uPlot.Axis.Side is a const enum with no runtime value: 3 is left, 1 is right
    side: index % 2 === 0 ? 3 : 1,
    // drop the series index the graph appends to the topic ("BMS/Segment_Total_Volt/0 0")
    label: key.replace(/ 0$/, ''),
    labelFont: `bold 16px ${FONT_FAMILY}`,
    labelSize: 26,
    grid: { show: index === 0, stroke: GRID_COLOR }
  }));
}

/**
 * Auto-ranges a y scale, with the user's fixed bounds taking precedence on either side.
 * A single fixed bound beyond the data would invert the range (uPlot then draws no axis), so the auto side
 * keeps the auto range's span past it instead.
 */
export function yRange(dataMin: number | null, dataMax: number | null, yMin: number | null, yMax: number | null) {
  // rangeNum only returns nulls for null input
  const [autoMin, autoMax] = (
    dataMin === null || dataMax === null ? [0, 1] : uPlot.rangeNum(dataMin, dataMax, 0.1, true)
  ) as [number, number];
  const span = autoMax - autoMin;
  if (yMin !== null && yMax === null && yMin >= autoMax) return [yMin, yMin + span] as uPlot.Range.MinMax;
  if (yMax !== null && yMin === null && yMax <= autoMin) return [yMax - span, yMax] as uPlot.Range.MinMax;
  return [yMin ?? autoMin, yMax ?? autoMax] as uPlot.Range.MinMax;
}

/** Draws a dashed, labelled line at each local midnight in view while `enabled()` holds. */
export function dayBoundaryPlugin(enabled: () => boolean): uPlot.Plugin {
  return {
    hooks: {
      draw: (u) => {
        const { min, max } = u.scales['x'];
        if (!enabled() || min === undefined || max === undefined) return;
        const { ctx, bbox } = u;
        const px = uPlot.pxRatio;
        ctx.save();
        ctx.strokeStyle = DAY_BOUNDARY_COLOR;
        ctx.lineWidth = px;
        ctx.font = `${11 * px}px ${FONT_FAMILY}`;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'left';
        for (const t of dayBoundaries(min, max)) {
          const x = Math.round(u.valToPos(t, 'x', true));
          ctx.setLineDash([4 * px, 4 * px]);
          ctx.beginPath();
          ctx.moveTo(x, bbox.top);
          ctx.lineTo(x, bbox.top + bbox.height);
          ctx.stroke();
          // A boxed label like develop's annotation, so series lines crossing the top of the plot don't hide it.
          const text = new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          const padding = 3 * px;
          const box = {
            x: x + 4 * px,
            y: bbox.top + 4 * px,
            width: ctx.measureText(text).width + 2 * padding,
            height: 11 * px + 2 * padding
          };
          ctx.setLineDash([]);
          ctx.fillStyle = DAY_LABEL_BACKGROUND;
          ctx.fillRect(box.x, box.y, box.width, box.height);
          ctx.strokeRect(box.x, box.y, box.width, box.height);
          ctx.fillStyle = AXIS_COLOR;
          ctx.fillText(text, box.x + padding, box.y + padding);
        }
        ctx.restore();
      }
    }
  };
}

/**
 * A hover tooltip that follows the cursor: the time under it, then each visible topic's nearest value.
 * Built with text nodes, never innerHTML, since topic names come from the wire.
 */
export function tooltipPlugin(): uPlot.Plugin {
  let tooltip: HTMLDivElement;

  return {
    hooks: {
      init: (u) => {
        tooltip = document.createElement('div');
        tooltip.className = 'u-tooltip';
        Object.assign(tooltip.style, {
          position: 'absolute',
          display: 'none',
          pointerEvents: 'none',
          zIndex: '100',
          padding: '6px 8px',
          background: 'rgba(30, 30, 30, 0.92)',
          color: '#fff',
          border: '1px solid #555',
          borderRadius: '4px',
          font: AXIS_FONT,
          whiteSpace: 'nowrap'
        });
        u.over.appendChild(tooltip);
      },
      setCursor: (u) => {
        const { left, top, idx, idxs } = u.cursor;
        if (idx === null || idx === undefined || left === undefined || top === undefined || left < 0) {
          tooltip.style.display = 'none';
          return;
        }

        const rows: { text: string; color: string | null }[] = [{ text: tooltipTimeLabel(u.data[0][idx]), color: null }];
        for (let s = 1; s < u.series.length; s++) {
          const series = u.series[s];
          const valueIdx = idxs?.[s];
          if (!series.show || valueIdx === null || valueIdx === undefined) continue;
          const value = u.data[s][valueIdx];
          if (value !== null && value !== undefined) {
            rows.push({ text: `${series.label}: ${tooltipNumber.format(value)}`, color: seriesColor(s - 1) });
          }
        }

        tooltip.replaceChildren(
          ...rows.map(({ text, color }) => {
            // White text with a color swatch: some palette colors miss WCAG AA contrast as text on the dark tooltip.
            const row = document.createElement('div');
            if (color === null) {
              row.textContent = text;
              return row;
            }
            const swatch = document.createElement('span');
            Object.assign(swatch.style, {
              display: 'inline-block',
              width: '8px',
              height: '8px',
              marginRight: '6px',
              borderRadius: '50%',
              background: color
            });
            row.append(swatch, text);
            return row;
          })
        );
        tooltip.style.display = 'block';
        const { x, y } = placeTooltip(
          left,
          top,
          tooltip.offsetWidth,
          tooltip.offsetHeight,
          u.over.clientWidth,
          u.over.clientHeight
        );
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
      }
    }
  };
}

export interface GraphChartConfig {
  keys: string[];
  multipleYAxes: boolean;
  /** The user's Y Min/Max, read whenever uPlot ranges a y scale, so new bounds need a rescale, not a rebuild. */
  yBounds: () => { yMin: number | null; yMax: number | null };
  /** Whether the data spans several days, read on every draw: day-boundary lines show only then. */
  isMultiDay: () => boolean;
  /** Called whenever the x scale changes with whether it is zoomed in, i.e. narrower than the data. */
  onZoomChange?: (zoomed: boolean) => void;
  /** Whether x auto-fits the data (no pinned live window), the only time a narrower x scale is a user zoom. */
  autoFitsX?: () => boolean;
}

/** Reports whether the x scale is zoomed in from the full data range, each time it changes. */
export function zoomStatePlugin(onZoomChange: (zoomed: boolean) => void, autoFitsX: () => boolean): uPlot.Plugin {
  let zoomed: boolean | null = null;
  return {
    hooks: {
      // Each chart starts unzoomed. A rebuild to an empty chart never fires setScale('x') (its x scale stays
      // null), so without this the previous chart's zoom would keep the Reset zoom button up.
      init: () => {
        zoomed = false;
        onZoomChange(false);
      },
      setScale: (u, key) => {
        if (key !== 'x') return;
        const [xs] = u.data;
        const { min, max } = u.scales['x'];
        const now =
          autoFitsX() && xs.length > 1 && min !== undefined && max !== undefined && (min > xs[0] || max < xs[xs.length - 1]);
        if (now !== zoomed) {
          zoomed = now;
          onZoomChange(now);
        }
      }
    }
  };
}

/** The x tick labels: a date and time when more than a day is in view, else the time to the second. */
const xAxisValues = (u: uPlot, splits: number[]) => {
  const { min = 0, max = 0 } = u.scales['x'];
  const format = max - min > DAY_MS ? multiDayLabel : singleDayLabel;
  return splits.map(format);
};

/** uPlot options for the graph page: drag-to-zoom on x (double-click resets), hover tooltip, toggleable legend. */
export function buildGraphChartOptions(config: GraphChartConfig): UplotChartOptions {
  const { keys, multipleYAxes, yBounds, isMultiDay, onZoomChange, autoFitsX } = config;

  const scales: uPlot.Scales = { x: { time: true } };
  const scaleKeys = multipleYAxes ? keys.map((_, i) => yScaleKey(i, true)) : ['y'];
  for (const key of scaleKeys) {
    scales[key] = {
      range: (u, dataMin, dataMax) => {
        // No shown series on this scale (hidden from the legend): leave it unranged, so uPlot hides its axis
        // instead of drawing a meaningless 0-1 one.
        if (u.series && !u.series.some((s, i) => i > 0 && s.show && s.scale === key)) return [null, null];
        const { yMin, yMax } = yBounds();
        return yRange(dataMin, dataMax, yMin, yMax);
      }
    };
  }

  return {
    ms: 1,
    scales,
    series: [
      {},
      ...keys.map(
        (key, index): uPlot.Series => ({
          label: key,
          scale: yScaleKey(index, multipleYAxes),
          stroke: seriesColor(index),
          width: 2,
          spanGaps: true,
          points: { show: false }
        })
      )
    ],
    axes: [
      {
        stroke: AXIS_COLOR,
        grid: { stroke: GRID_COLOR },
        ticks: { stroke: GRID_COLOR },
        font: AXIS_FONT,
        incrs: X_INCRS,
        // "10/17 10:46" needs more room than "12:10:00"
        space: (_u, _axisIdx, min, max) => (max - min > DAY_MS ? 100 : 70),
        values: xAxisValues
      },
      ...buildYAxes(keys, multipleYAxes)
    ],
    cursor: { drag: { x: true, y: false } },
    legend: { live: false, markers: { fill: (_u, i) => seriesColor(i - 1) } },
    plugins: [
      tooltipPlugin(),
      dayBoundaryPlugin(isMultiDay),
      ...(multipleYAxes ? [{ hooks: { init: showGridOnFirstVisibleAxis, setSeries: showGridOnFirstVisibleAxis } }] : []),
      ...(onZoomChange ? [zoomStatePlugin(onZoomChange, autoFitsX ?? (() => true))] : [])
    ]
  };
}

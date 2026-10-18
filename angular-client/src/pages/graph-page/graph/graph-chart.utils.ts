import uPlot from 'uplot';
import { GraphData } from 'src/utils/types.utils';
import { UplotChartOptions } from 'src/components/uplot-chart/uplot-chart.component';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** ApexCharts' default palette, so topics keep the colors they had before the move to uPlot. */
export const SERIES_COLORS = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0'];

const AXIS_COLOR = '#fff';
const GRID_COLOR = 'rgba(255, 255, 255, 0.12)';
const DAY_BOUNDARY_COLOR = '#8fcadd';

/**
 * Merges each series' points (each sorted by x) onto one shared, sorted x array: uPlot's aligned-data shape.
 * A series with no point at an x gets `undefined` there, which uPlot treats as an alignment gap:
 * `spanGaps` draws the line across it and the hover cursor skips it to the series' nearest real point.
 * A k-way merge, O(points x series), so it stays cheap enough to run once per animation frame.
 */
export function alignSeries(lines: GraphData[][]): uPlot.AlignedData {
  const cursors = lines.map(() => 0);
  const xs: number[] = [];
  const ys: (number | undefined)[][] = lines.map(() => []);

  for (;;) {
    let nextX = Infinity;
    for (let s = 0; s < lines.length; s++) {
      const point = lines[s][cursors[s]];
      if (point !== undefined && point.x < nextX) nextX = point.x;
    }
    if (nextX === Infinity) break;

    xs.push(nextX);
    for (let s = 0; s < lines.length; s++) {
      const point = lines[s][cursors[s]];
      if (point !== undefined && point.x === nextX) {
        ys[s].push(point.y);
        cursors[s]++;
      } else {
        ys[s].push(undefined);
      }
    }
  }

  return [xs, ...ys];
}

/** The x extent of every series (each sorted by x), or null when there are no points. */
export function dataSpan(lines: GraphData[][]): { minX: number; maxX: number; spanMs: number } | null {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const points of lines) {
    if (points.length === 0) continue;
    if (points[0].x < minX) minX = points[0].x;
    if (points[points.length - 1].x > maxX) maxX = points[points.length - 1].x;
  }
  if (!isFinite(minX) || !isFinite(maxX)) return null;
  return { minX, maxX, spanMs: maxX - minX };
}

/** Local midnights strictly after `minX` and before `maxX`. */
export function dayBoundaries(minX: number, maxX: number): number[] {
  const boundaries: number[] = [];
  const cursor = new Date(minX);
  cursor.setHours(24, 0, 0, 0);
  for (let t = cursor.getTime(); t < maxX; t += DAY_MS) boundaries.push(t);
  return boundaries;
}

export const singleDayLabel = (ms: number): string => new Date(ms).toLocaleTimeString('en-US', { hour12: false });

export const multiDayLabel = (ms: number): string => {
  const d = new Date(ms);
  const date = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
};

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

/** Scale key of the series at `index` (0-based over the topics, not counting uPlot's x series). */
const yScaleKey = (index: number, multipleYAxes: boolean) => (multipleYAxes ? `y${index}` : 'y');

/**
 * The y-axes for the current topics: one shared axis, or one per topic with alternating sides so stacked axes
 * stay readable. Built from the current series keys every time they change, so deselecting a topic prunes its axis (#630).
 */
export function buildYAxes(keys: string[], multipleYAxes: boolean): uPlot.Axis[] {
  const base: uPlot.Axis = {
    stroke: AXIS_COLOR,
    grid: { stroke: GRID_COLOR },
    ticks: { stroke: GRID_COLOR }
  };
  if (!multipleYAxes) return [{ ...base, scale: 'y' }];

  return keys.map((key, index) => ({
    ...base,
    scale: yScaleKey(index, true),
    // uPlot.Axis.Side is a const enum with no runtime value: 3 is left, 1 is right
    side: index % 2 === 0 ? 3 : 1,
    label: key.replace('0', ''),
    labelFont: 'bold 16px sans-serif',
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
        ctx.fillStyle = AXIS_COLOR;
        ctx.lineWidth = px;
        ctx.setLineDash([4 * px, 4 * px]);
        ctx.font = `${11 * px}px sans-serif`;
        ctx.textBaseline = 'top';
        for (const t of dayBoundaries(min, max)) {
          const x = Math.round(u.valToPos(t, 'x', true));
          ctx.beginPath();
          ctx.moveTo(x, bbox.top);
          ctx.lineTo(x, bbox.top + bbox.height);
          ctx.stroke();
          const text = new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          ctx.fillText(text, x + 4 * px, bbox.top + 4 * px);
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
          font: '12px sans-serif',
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
            rows.push({ text: `${series.label}: ${value}`, color: SERIES_COLORS[(s - 1) % SERIES_COLORS.length] });
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
        // Flip to the cursor's other side near the right/bottom edges so the tooltip stays in the plot.
        const flipX = left + tooltip.offsetWidth + 16 > u.over.clientWidth;
        const flipY = top + tooltip.offsetHeight + 16 > u.over.clientHeight;
        tooltip.style.left = `${flipX ? left - tooltip.offsetWidth - 12 : left + 12}px`;
        tooltip.style.top = `${flipY ? top - tooltip.offsetHeight - 12 : top + 12}px`;
      }
    }
  };
}

export interface GraphChartConfig {
  keys: string[];
  multipleYAxes: boolean;
  yMin: number | null;
  yMax: number | null;
  /** Read on every axis redraw, so switching label formats needs no rebuild. */
  isMultiDay: () => boolean;
}

/** uPlot options for the graph page: drag-to-zoom on x (double-click resets), hover tooltip, toggleable legend. */
export function buildGraphChartOptions(config: GraphChartConfig): UplotChartOptions {
  const { keys, multipleYAxes, yMin, yMax, isMultiDay } = config;

  const scales: uPlot.Scales = { x: { time: true } };
  const scaleKeys = multipleYAxes ? keys.map((_, i) => yScaleKey(i, true)) : ['y'];
  for (const key of scaleKeys) {
    scales[key] = { range: (_u, dataMin, dataMax) => yRange(dataMin, dataMax, yMin, yMax) };
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
          stroke: SERIES_COLORS[index % SERIES_COLORS.length],
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
        space: 90,
        values: (_u, splits) => splits.map((ms) => (isMultiDay() ? multiDayLabel(ms) : singleDayLabel(ms)))
      },
      ...buildYAxes(keys, multipleYAxes)
    ],
    cursor: { drag: { x: true, y: false } },
    legend: { live: false },
    plugins: [tooltipPlugin(), dayBoundaryPlugin(isMultiDay)]
  };
}

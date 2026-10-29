import {
  Chart,
  ChartOptions,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  TooltipItem,
  Tooltip
} from 'chart.js';
import { binarySearchInsertIndex } from 'src/utils/array.utils';
import { GraphData } from 'src/utils/types.utils';

/**
 * Shared by the small live line charts (graph-component, double-line-graph). Their callers push points into
 * the data arrays they pass in, with no new array or signal per point, so the charts re-read them on a timer.
 */
export const LIVE_REFRESH_MS = 800;
export const DEFAULT_TIME_RANGE_SEC = 120;

/** Only what the line charts use, so the rest of Chart.js tree-shakes out */
export const LIVE_LINE_REGISTERABLES = [LineController, LineElement, PointElement, LinearScale, Tooltip, Legend];

const TICK_COLOR = '#FFFFFF';
const LEGEND_COLOR = '#fffff4';

const pad = (n: number) => (n < 10 ? '0' : '') + n;

/** A timestamp as a local clock time, e.g. 9:05:07 */
export function formatClock(ms: number): string {
  const date = new Date(ms);
  return `${date.getHours()}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** A timestamp as a local date and time, e.g. 1/31/26, 9:05:07 */
function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  return `${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(-2)}, ${formatClock(ms)}`;
}

/**
 * The x range to show: every point until they span more than `rangeMs`, then the last `rangeMs` ending at the
 * latest point of any line. Lines are sorted by x. Undefined with no points.
 */
export function liveWindow(lines: GraphData[][], rangeMs: number): { min: number; max: number } | undefined {
  let first = Infinity;
  let last = -Infinity;
  for (const line of lines) {
    if (line.length === 0) continue;
    first = Math.min(first, line[0].x);
    last = Math.max(last, line[line.length - 1].x);
  }
  if (!isFinite(first)) return undefined;
  if (first === last) return { min: first - 500, max: last + 500 };
  return { min: Math.max(first, last - rangeMs), max: last };
}

/**
 * A copy of the points from `min` on, plus the one before it so the line enters from the axis edge. A copy:
 * Chart.js patches the methods of the data arrays it's given, and these arrays belong to the caller.
 */
export function windowPoints(line: GraphData[], min: number): GraphData[] {
  return line.slice(Math.max(0, binarySearchInsertIndex(line, min) - 1));
}

/**
 * Points the chart's x-axis at `window`. With no points, Chart.js would label an empty axis from epoch zero, so
 * both axes drop their labels until there's data.
 */
export function applyLiveWindow(chart: Chart<'line', GraphData[]>, window: { min: number; max: number } | undefined): void {
  const { x, y } = chart.config.options!.scales!;
  x!.min = window?.min;
  x!.max = window?.max;
  x!.ticks!.display = y!.ticks!.display = window !== undefined;
}

/** Options for a live line chart on the dark info background: clock-time x-axis, no grid, few ticks. */
export function buildLiveLineOptions({ legend }: { legend: boolean }): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    parsing: false,
    normalized: true,
    elements: {
      point: { radius: 0, hoverRadius: 3 },
      line: { borderWidth: 2 }
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false },
    scales: {
      x: {
        type: 'linear',
        grid: { display: false },
        border: { display: false },
        ticks: { color: TICK_COLOR, maxTicksLimit: 3, maxRotation: 0, callback: (value) => formatClock(+value) }
      },
      y: {
        type: 'linear',
        grid: { display: false },
        ticks: { color: TICK_COLOR, maxTicksLimit: 3 }
      }
    },
    plugins: {
      legend: { display: legend, labels: { color: LEGEND_COLOR } },
      tooltip: {
        callbacks: {
          title: (items: TooltipItem<'line'>[]) => (items.length ? formatTimestamp(items[0].parsed.x ?? 0) : '')
        }
      }
    }
  };
}

import type { ChartOptions } from 'chart.js';
import type { AnnotationOptions } from 'chartjs-plugin-annotation';
import { GraphData } from 'src/utils/types.utils';

export const DAY_MS = 24 * 60 * 60 * 1000;

/** ApexCharts' default palette, kept so series keep the colors users are used to. */
export const SERIES_COLORS = ['#008FFB', '#00E396', '#FEB019', '#FF4560', '#775DD0'];

const TICK_COLOR = '#fff';
const GRID_COLOR = 'rgba(255, 255, 255, 0.1)';

export type ScaleConfig = NonNullable<ChartOptions<'line'>['scales']>[string];

export type DataSpan = { minX: number; maxX: number; spanMs: number };

/** Chart.js scale id of a series' y-axis: the shared `y` axis, or one axis per series when multi-axis is on. */
export function yAxisIdFor(index: number, multipleYAxes: boolean): string {
  return multipleYAxes && index > 0 ? `y${index}` : 'y';
}

/**
 * Builds the y scales for the current series keys: one shared axis, or one per series
 * (alternating sides) when multi-axis is on. User y-limits apply to every axis.
 */
export function buildYScales(
  keys: string[],
  multipleYAxes: boolean,
  limits: { yMin: number | null; yMax: number | null }
): Record<string, ScaleConfig> {
  const base = (): ScaleConfig => ({
    type: 'linear',
    min: limits.yMin ?? undefined,
    max: limits.yMax ?? undefined,
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
      title: {
        display: true,
        text: key.replace('0', ''),
        color: 'grey',
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

export const singleDayLabel = (val: number): string => new Date(val).toLocaleTimeString('en-US', { hour12: false });

export const multiDayLabel = (val: number): string => {
  const d = new Date(val);
  const date = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
};

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
      borderColor: '#8fcadd',
      borderWidth: 1,
      borderDash: [4, 4],
      label: {
        display: true,
        position: 'start',
        color: '#fff',
        backgroundColor: '#0c2026',
        borderColor: '#8fcadd',
        borderWidth: 1,
        font: { size: 11 },
        content: new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      }
    });
  }
  return annotations;
}

/** Base options for the graph page's line chart. Scales, windowing and annotations are filled in per frame. */
export function buildBaseOptions(callbacks: { onZoom: () => void; xLabel: (val: number) => string }): ChartOptions<'line'> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    // Points are pushed as {x, y} already sorted by x, so Chart.js can skip parsing and binary-search hovers
    parsing: false,
    normalized: true,
    spanGaps: true,
    interaction: { mode: 'nearest', intersect: false, axis: 'x' },
    elements: {
      point: { radius: 0, hoverRadius: 4 },
      line: { borderWidth: 3, tension: 0 }
    },
    scales: {
      x: {
        type: 'linear',
        ticks: {
          color: TICK_COLOR,
          maxTicksLimit: 6,
          maxRotation: 0,
          callback: (value) => callbacks.xLabel(+value)
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
        callbacks: {
          title: (items) => (items.length ? new Date(items[0].parsed.x ?? 0).toLocaleString('en-US') : '')
        }
      },
      // Min-max decimation keeps peaks visible when a series has more points than pixels (long historical ranges)
      decimation: { enabled: true, algorithm: 'min-max' },
      zoom: {
        zoom: {
          drag: { enabled: true, backgroundColor: 'rgba(143, 202, 221, 0.25)' },
          wheel: { enabled: true, modifierKey: 'ctrl' },
          pinch: { enabled: true },
          mode: 'x',
          onZoomComplete: callbacks.onZoom
        },
        pan: { enabled: true, mode: 'x', modifierKey: 'shift', onPanComplete: callbacks.onZoom }
      },
      annotation: { annotations: [] }
    }
  };
}

import { GraphData } from 'src/utils/types.utils';

export const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Develop's series colours: ApexCharts 5's default palette (palette1). dygraphs' own default is a dark palette
 * whose hues are spread by the series count, so every series changed colour whenever a topic was added.
 */
export const SERIES_COLORS = ['#008FFB', '#00A86F', '#CA8501', '#FF4560', '#846DD5'];

/** One dygraphs row: the x value (ms since epoch) then one y per series, null where that series has no point at x. */
export type DygraphRow = [number, ...(number | null)[]];

/**
 * Merges per-series points into dygraphs' native row format, which shares one x column across every series.
 * Each series must be sorted by x (the graph keeps them sorted as points arrive), so this is a k-way merge:
 * O(rows × series), with no sort.
 */
export function toDygraphRows(series: ReadonlyArray<ReadonlyArray<GraphData>>): DygraphRow[] {
  const heads = series.map(() => 0);
  const rows: DygraphRow[] = [];
  for (;;) {
    let minX = Infinity;
    for (let s = 0; s < series.length; s++) {
      const point = series[s][heads[s]];
      if (point !== undefined && point.x < minX) minX = point.x;
    }
    if (minX === Infinity) return rows;

    const row: DygraphRow = [minX];
    for (let s = 0; s < series.length; s++) {
      const point = series[s][heads[s]];
      if (point !== undefined && point.x === minX) {
        row.push(point.y);
        heads[s]++;
      } else {
        row.push(null);
      }
    }
    rows.push(row);
  }
}

/**
 * A series' sample to show at time x: the latest at or before x, or the first one when every sample is after x
 * (then the nearest overall). The points must be sorted by x; undefined only when there are none.
 */
export function sampleAtOrBefore(points: readonly GraphData[], x: number): GraphData | undefined {
  // First index at or after x
  let lo = 0;
  let hi = points.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (points[mid].x < x) lo = mid + 1;
    else hi = mid;
  }
  return points[lo]?.x === x ? points[lo] : points[Math.max(lo - 1, 0)];
}

/** Local midnights strictly between minX and maxX, for per-day boundary lines on multi-day ranges. */
export function dayBoundaries(minX: number, maxX: number): number[] {
  const boundaries: number[] = [];
  const cursor = new Date(minX);
  // First local midnight strictly after minX; stepping by calendar day keeps DST days right.
  cursor.setHours(24, 0, 0, 0);
  while (cursor.getTime() < maxX) {
    boundaries.push(cursor.getTime());
    cursor.setDate(cursor.getDate() + 1);
  }
  return boundaries;
}

/** A series label is `${topic} ${valueIndex}`; the first value of a topic is titled by the topic alone. */
export function topicTitle(seriesLabel: string): string {
  return seriesLabel.replace(/ 0$/, '');
}

/**
 * Per-series axis assignment. dygraphs draws at most two y-axes, so with multiple y-axes on, series alternate
 * between the left (y1) and right (y2) axis, and each axis is titled by the topics on it.
 */
export function seriesAxisOptions(
  labels: readonly string[],
  multipleYAxes: boolean
): { series: Record<string, { axis: 'y1' | 'y2' }>; ylabel: string; y2label: string } {
  const series: Record<string, { axis: 'y1' | 'y2' }> = {};
  const left: string[] = [];
  const right: string[] = [];
  labels.forEach((label, index) => {
    const axis = multipleYAxes && index % 2 !== 0 ? 'y2' : 'y1';
    series[label] = { axis };
    (axis === 'y1' ? left : right).push(topicTitle(label));
  });
  return {
    series,
    ylabel: multipleYAxes ? left.join(', ') : '',
    y2label: multipleYAxes ? right.join(', ') : ''
  };
}

// One cached formatter each: dygraphs formats every tick on every redraw, and toLocale*String builds a new
// formatter per call. In the hour repeated when clocks fall back, dygraphs' date ticker generates an hour of
// off-screen ticks per redraw, which made each redraw about 20x slower.
const TIME_FMT = new Intl.DateTimeFormat('en-US', {
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});
const DAY_FMT = new Intl.DateTimeFormat('en-US', { month: 'numeric', day: 'numeric' });
const HOUR_MINUTE_FMT = new Intl.DateTimeFormat('en-US', { hourCycle: 'h23', hour: '2-digit', minute: '2-digit' });
const DAY_BOUNDARY_FMT = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const HOVER_FMT = new Intl.DateTimeFormat('en-US', {
  year: '2-digit',
  month: 'numeric',
  day: 'numeric',
  hourCycle: 'h23',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit'
});

/**
 * A tick within one day, e.g. 13:04:05. On a window of a few seconds dygraphs puts ticks 500 ms apart or closer,
 * so a tick between whole seconds also shows its fraction (13:04:05.5); whole seconds alone would repeat.
 */
export const singleDayLabel = (ms: number | Date): string => {
  const t = Math.round(+ms);
  const time = TIME_FMT.format(t);
  const fraction = t % 1000;
  return fraction ? `${time}.${String(fraction).padStart(3, '0').replace(/0+$/, '')}` : time;
};

export const multiDayLabel = (ms: number | Date): string => `${DAY_FMT.format(+ms)} ${HOUR_MINUTE_FMT.format(+ms)}`;

export const dayBoundaryLabel = (ms: number): string => DAY_BOUNDARY_FMT.format(ms);

/** Hover value for the x-axis, e.g. 1/2/26, 13:04:05. */
export const hoverTimeLabel = (ms: number): string => HOVER_FMT.format(ms);

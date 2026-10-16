import { GraphData } from 'src/utils/types.utils';

export const DAY_MS = 24 * 60 * 60 * 1000;

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

export const singleDayLabel = (ms: number | Date): string => new Date(+ms).toLocaleTimeString('en-US', { hour12: false });

export const multiDayLabel = (ms: number | Date): string => {
  const d = new Date(+ms);
  const date = d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  return `${date} ${time}`;
};

export const dayBoundaryLabel = (ms: number): string =>
  new Date(ms).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/** Hover value for the x-axis, e.g. 1/2/26, 13:04:05. */
export const hoverTimeLabel = (ms: number): string =>
  new Date(ms).toLocaleString('en-US', {
    year: '2-digit',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

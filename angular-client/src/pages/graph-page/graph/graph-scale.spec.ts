import {
  AXIS_WIDTH,
  DAY_MS,
  axisRange,
  axisSlots,
  computeView,
  dayBoundaries,
  formatTick,
  hoverPoint,
  nearestPoint,
  niceTicks,
  plotArea,
  timeTicks,
  valueExtent,
  ViewInput
} from './graph-scale';

const pts = (...xy: [number, number][]) => xy.map(([x, y]) => ({ x, y }));

const viewInput = (overrides: Partial<ViewInput>): ViewInput => ({
  series: [],
  multiAxis: false,
  realTime: false,
  windowMs: undefined,
  zoom: null,
  yOverride: { min: null, max: null },
  ...overrides
});

describe('graph-scale', () => {
  describe('niceTicks', () => {
    it('picks round 1/2/5 steps inside the range', () => {
      expect(niceTicks({ min: 0, max: 10 }, 5)).toEqual([0, 2, 4, 6, 8, 10]);
      expect(niceTicks({ min: 0.13, max: 0.61 }, 5)).toEqual([0.2, 0.3, 0.4, 0.5, 0.6]);
    });
  });

  describe('timeTicks', () => {
    it('lands on whole seconds for a 30 s window', () => {
      const start = new Date(2026, 0, 1, 12, 0, 0, 300).getTime();
      const ticks = timeTicks({ min: start, max: start + 30_000 }, 6);
      expect(ticks.length).toBeGreaterThan(1);
      expect(ticks.length).toBeLessThanOrEqual(7);
      ticks.forEach((t) => expect(new Date(t).getMilliseconds()).toBe(0));
    });

    it('lands on local hours for a multi-hour window', () => {
      const start = new Date(2026, 0, 1, 9, 17).getTime();
      const ticks = timeTicks({ min: start, max: start + 6 * 60 * 60 * 1000 }, 6);
      ticks.forEach((t) => expect(new Date(t).getMinutes()).toBe(0));
    });
  });

  it('formatTick shows only the decimals the step needs', () => {
    expect(formatTick(2, 1)).toBe('2');
    expect(formatTick(0.25, 0.05)).toBe('0.25');
  });

  it('dayBoundaries returns each local midnight strictly inside the range', () => {
    const start = new Date(2026, 0, 1, 18).getTime();
    const boundaries = dayBoundaries({ min: start, max: start + 2 * DAY_MS });
    expect(boundaries).toEqual([new Date(2026, 0, 2).getTime(), new Date(2026, 0, 3).getTime()]);
  });

  describe('nearestPoint', () => {
    const line = pts([0, 1], [10, 2], [20, 3]);

    it('returns the closest point by x', () => {
      expect(nearestPoint(line, 4)).toEqual({ x: 0, y: 1 });
      expect(nearestPoint(line, 6)).toEqual({ x: 10, y: 2 });
    });

    it('clamps to the ends and handles empty lines', () => {
      expect(nearestPoint(line, -5)).toEqual({ x: 0, y: 1 });
      expect(nearestPoint(line, 99)).toEqual({ x: 20, y: 3 });
      expect(nearestPoint([], 1)).toBeUndefined();
    });
  });

  describe('hoverPoint', () => {
    const line = pts([0, 1], [10, 2], [20, 3]);

    it('returns the nearest point inside the series, and just past its ends', () => {
      expect(hoverPoint(line, 6, 2)).toEqual({ x: 10, y: 2 });
      expect(hoverPoint(line, -2, 2)).toEqual({ x: 0, y: 1 });
      expect(hoverPoint(line, 22, 2)).toEqual({ x: 20, y: 3 });
    });

    it('skips a series with no data near the cursor', () => {
      expect(hoverPoint(line, -5, 2)).toBeUndefined();
      expect(hoverPoint(line, 99, 2)).toBeUndefined();
      expect(hoverPoint([], 1, 2)).toBeUndefined();
    });
  });

  it('valueExtent only counts points inside the x range (autoscale to the visible window)', () => {
    const line = pts([0, 100], [10, 2], [20, 5], [30, -50]);
    expect(valueExtent(line, { min: 5, max: 25 })).toEqual({ min: 2, max: 5 });
    expect(valueExtent(line, { min: 40, max: 50 })).toBeNull();
  });

  describe('axisRange', () => {
    it('snaps the data extent out to round values', () => {
      expect(axisRange({ min: 1.3, max: 9.2 }, { min: null, max: null })).toEqual({ min: 0, max: 10 });
    });

    it('honours the configured y min/max', () => {
      expect(axisRange({ min: 1.3, max: 9.2 }, { min: -5, max: 50 })).toEqual({ min: -5, max: 50 });
    });

    it('gives a flat line some height', () => {
      const r = axisRange({ min: 5, max: 5 }, { min: null, max: null });
      expect(r.min).toBeLessThan(5);
      expect(r.max).toBeGreaterThan(5);
    });
  });

  it('axisSlots alternates sides and stacks outward', () => {
    expect(axisSlots(3)).toEqual([
      { side: 'left', slot: 0 },
      { side: 'right', slot: 0 },
      { side: 'left', slot: 1 }
    ]);
  });

  it('plotArea leaves a gutter per axis', () => {
    expect(plotArea(1000, 500, 1).left).toBe(AXIS_WIDTH);
    const three = plotArea(1000, 500, 3);
    expect(three.left).toBe(2 * AXIS_WIDTH);
    expect(three.width).toBe(1000 - 3 * AXIS_WIDTH);
  });

  describe('computeView', () => {
    const a = pts([0, 1], [1000, 4], [2000, 2]);
    const b = pts([500, 100], [2500, 300]);

    it('returns null with no data', () => {
      expect(computeView(viewInput({ series: [{ points: [], visible: true }] }))).toBeNull();
    });

    it('fits all data when there is no live window', () => {
      const view = computeView(viewInput({ series: [{ points: a, visible: true }], realTime: true }))!;
      expect(view.x).toEqual({ min: 0, max: 2000 });
    });

    it('follows the latest point with the live window in real-time mode', () => {
      const view = computeView(
        viewInput({
          series: [
            { points: a, visible: true },
            { points: b, visible: true }
          ],
          realTime: true,
          windowMs: 1000
        })
      )!;
      expect(view.x).toEqual({ min: 1500, max: 2500 });
    });

    it('lets a user zoom override the live window', () => {
      const zoom = { min: 100, max: 200 };
      const view = computeView(viewInput({ series: [{ points: a, visible: true }], realTime: true, windowMs: 1000, zoom }))!;
      expect(view.x).toEqual(zoom);
    });

    it('shares one axis across series, ignoring hidden ones', () => {
      const view = computeView(
        viewInput({
          series: [
            { points: a, visible: true },
            { points: b, visible: false }
          ]
        })
      )!;
      expect(view.axes.length).toBe(1);
      expect(view.seriesAxis).toEqual([0, 0]);
      expect(view.axes[0].max).toBeLessThan(100);
    });

    // #630: with multiple y-axes the axis set must always match the selected topics.
    it('builds one axis per series in multi-axis mode, so a dropped topic drops its axis', () => {
      const both = computeView(
        viewInput({
          series: [
            { points: a, visible: true },
            { points: b, visible: true }
          ],
          multiAxis: true
        })
      )!;
      expect(both.axes.length).toBe(2);
      expect(both.seriesAxis).toEqual([0, 1]);

      const one = computeView(viewInput({ series: [{ points: a, visible: true }], multiAxis: true }))!;
      expect(one.axes.length).toBe(1);
    });

    it('flags historical data spanning more than a day as multi-day', () => {
      const long = pts([0, 1], [2 * DAY_MS, 2]);
      expect(computeView(viewInput({ series: [{ points: long, visible: true }] }))!.multiDay).toBeTrue();
      expect(computeView(viewInput({ series: [{ points: long, visible: true }], realTime: true }))!.multiDay).toBeFalse();
    });
  });
});

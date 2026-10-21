import {
  AXIS_WIDTH,
  DAY_MS,
  axisRange,
  axisSlots,
  clampZoom,
  computeView,
  dayBoundaries,
  formatTick,
  formatTimeTick,
  hoverPoint,
  nearestPoint,
  niceTicks,
  plotArea,
  snapX,
  timeAxis,
  timeTicks,
  tooltipTop,
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

  // Labels are local time; these build dates with the local-time Date constructor, so they hold
  // in any zone (CI runs UTC, the team America/New_York).
  describe('formatTimeTick', () => {
    const t = new Date(2026, 9, 17, 22, 42, 30, 250).getTime();

    it('shows only as much precision as the tick step needs', () => {
      expect(formatTimeTick(t, 100, false)).toBe('22:42:30.250');
      expect(formatTimeTick(t, 5000, false)).toBe('22:42:30');
      expect(formatTimeTick(t, 60_000, false)).toBe('22:42');
    });

    it('adds the date when asked, and shows only the date for day steps', () => {
      expect(formatTimeTick(t, 60_000, true)).toBe('10/17 22:42');
      expect(formatTimeTick(t, 1000, true)).toBe('10/17 22:42:30');
      expect(formatTimeTick(new Date(2026, 9, 18).getTime(), DAY_MS, true)).toBe('10/18');
    });

    it('writes midnight as 00, not 24', () => {
      expect(formatTimeTick(new Date(2026, 9, 18).getTime(), 1000, false)).toBe('00:00:00');
    });
  });

  describe('timeAxis', () => {
    const charWidth = (s: string) => s.length * 7;

    it('labels sub-second ticks with milliseconds so they stay distinct', () => {
      const start = new Date(2026, 9, 17, 12, 17, 34).getTime();
      const { labels } = timeAxis({ min: start, max: start + 800 }, 900, charWidth);
      expect(new Set(labels).size).toBe(labels.length);
      labels.forEach((l) => expect(l).toMatch(/^12:17:34\.\d{3}$/));
    });

    it('labels second ticks without the date inside one day', () => {
      const start = new Date(2026, 9, 17, 22, 42, 10).getTime();
      const { labels } = timeAxis({ min: start, max: start + 40_000 }, 900, charWidth);
      expect(new Set(labels).size).toBe(labels.length);
      labels.forEach((l) => expect(l).toMatch(/^22:4\d:\d\d$/));
    });

    it('adds the date when the view crosses a midnight', () => {
      const start = new Date(2026, 9, 17, 20).getTime();
      const { labels } = timeAxis({ min: start, max: start + 30 * 60 * 60 * 1000 }, 900, charWidth);
      expect(new Set(labels).size).toBe(labels.length);
      labels.forEach((l) => expect(l).toMatch(/^10\/1[89]( \d\d:\d\d)?$/));
    });

    it('spaces ticks so the labels never overlap', () => {
      const start = new Date(2026, 9, 17, 20).getTime();
      const { ticks, labels } = timeAxis({ min: start, max: start + 30 * 60 * 60 * 1000 }, 500, charWidth);
      const px = (t: number) => ((t - start) / (30 * 60 * 60 * 1000)) * 500;
      for (let i = 1; i < ticks.length; i++) {
        const half = (charWidth(labels[i - 1]) + charWidth(labels[i])) / 2;
        expect(px(ticks[i]) - px(ticks[i - 1])).toBeGreaterThan(half);
      }
    });
  });

  describe('tooltipTop', () => {
    it('sits below the cursor when it fits', () => {
      expect(tooltipTop(100, 80, 500)).toBe(112);
    });

    it('flips above the cursor near the bottom', () => {
      expect(tooltipTop(450, 80, 500)).toBe(450 - 12 - 80);
    });

    it('stays inside the container when it fits neither way', () => {
      expect(tooltipTop(50, 200, 220)).toBe(20);
      expect(tooltipTop(50, 300, 220)).toBe(0);
    });
  });

  describe('clampZoom', () => {
    const data = { min: 1000, max: 2000 };

    it('keeps a zoom inside the data', () => {
      expect(clampZoom({ min: 900, max: 1100 }, data, 10)).toEqual({ min: 1000, max: 1200 });
      expect(clampZoom({ min: 1950, max: 2150 }, data, 10)).toEqual({ min: 1800, max: 2000 });
    });

    it('ends the zoom once it covers all the data', () => {
      expect(clampZoom({ min: 500, max: 3000 }, data, 10)).toBeNull();
    });

    it('stops zooming in at the minimum span', () => {
      expect(clampZoom({ min: 1500, max: 1502 }, data, 10)).toEqual({ min: 1496, max: 1506 });
    });
  });

  it('snapX picks the visible point nearest the cursor across series', () => {
    const a = pts([0, 1], [10, 2]);
    const b = pts([4, 5], [14, 6]);
    expect(
      snapX(
        [
          { points: a, visible: true },
          { points: b, visible: true }
        ],
        6,
        2
      )
    ).toBe(4);
    expect(
      snapX(
        [
          { points: a, visible: true },
          { points: b, visible: false }
        ],
        6,
        2
      )
    ).toBe(10);
    expect(snapX([{ points: a, visible: true }], 50, 2)).toBeUndefined();
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

    it('leaves hidden series out of the axes in multi-axis mode', () => {
      const view = computeView(
        viewInput({
          series: [
            { points: a, visible: false },
            { points: b, visible: true }
          ],
          multiAxis: true
        })
      )!;
      expect(view.axes.length).toBe(1);
      expect(view.axisSeries).toEqual([1]);
      expect(view.seriesAxis).toEqual([-1, 0]);
      expect(view.axes[0].min).toBeGreaterThanOrEqual(100);
    });

    it('bounds zoom by the data, or by the live window when that is wider', () => {
      const series = [
        { points: a, visible: true },
        { points: b, visible: true }
      ];
      const zoom = { min: 100, max: 200 };
      expect(computeView(viewInput({ series, zoom }))!.zoomBounds).toEqual({ min: 0, max: 2500 });
      // 2.5 s of data in a 10 s live window: zooming in from the window must still work
      const live = computeView(viewInput({ series, zoom, realTime: true, windowMs: 10_000 }))!;
      expect(live.zoomBounds).toEqual({ min: -7500, max: 2500 });
    });

    it('flags a view that crosses a local midnight as multi-day, from the view rather than the data', () => {
      const midnight = new Date(2026, 9, 18).getTime();
      const long = pts([midnight - DAY_MS / 2, 1], [midnight + DAY_MS, 2]);
      expect(computeView(viewInput({ series: [{ points: long, visible: true }] }))!.multiDay).toBeTrue();
      const zoom = { min: midnight + 60_000, max: midnight + 120_000 };
      expect(computeView(viewInput({ series: [{ points: long, visible: true }], zoom }))!.multiDay).toBeFalse();
    });
  });
});

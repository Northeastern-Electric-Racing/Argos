import {
  buildDayBoundaries,
  buildLayout,
  buildMultiYAxes,
  DAY_MS,
  LayoutOptions,
  SERIES_COLORS,
  toWallClockMs
} from './graph-layout.utils';

const base: LayoutOptions = {
  seriesNames: ['A 0'],
  multipleYAxes: false,
  yMin: null,
  yMax: null,
  span: null,
  uiRevision: 0,
  yRevision: 0,
  dataRevision: 0
};

describe('graph layout utils', () => {
  it('autoranges y when no bounds are set', () => {
    expect(buildLayout(base).yaxis?.autorange).toBeTrue();
  });

  it('fixes both y bounds when both are set', () => {
    const { yaxis } = buildLayout({ ...base, yMin: 0, yMax: 10 });
    expect(yaxis?.autorange).toBeFalse();
    expect(yaxis?.range).toEqual([0, 10]);
  });

  it('pins only the set end when one y bound is set, autoranging the other', () => {
    // autorangeoptions rather than a partial range with autorange 'min'/'max': Plotly.react
    // ignores a switch from autorange true to 'min'/'max' while uirevision stays the same.
    const minOnly = buildLayout({ ...base, yMin: 5 }).yaxis;
    expect(minOnly?.autorange).toBeTrue();
    expect(minOnly?.autorangeoptions).toEqual({ minallowed: 5 });
    const maxOnly = buildLayout({ ...base, yMax: 5 }).yaxis;
    expect(maxOnly?.autorange).toBeTrue();
    expect(maxOnly?.autorangeoptions).toEqual({ maxallowed: 5 });
  });

  it('stacks extra y-axes outward on alternating sides without overlapping', () => {
    const axes = buildMultiYAxes(['A', 'B', 'C', 'D', 'E']);
    expect(axes['yaxis'].overlaying).toBeUndefined();
    expect(axes['yaxis'].anchor).toBeUndefined();
    ['yaxis2', 'yaxis3', 'yaxis4', 'yaxis5'].forEach((key) => {
      expect(axes[key]).toEqual(jasmine.objectContaining({ overlaying: 'y', anchor: 'free', autoshift: true }));
    });
    expect(axes['yaxis4'].position).toBe(1);
    expect(axes['yaxis5'].position).toBe(0);
    // automargin grows the margins to fit the stacked axes' ticks and titles.
    expect(Object.values(axes).every((axis) => axis.automargin === true)).toBeTrue();
  });

  it('autoranges every per-topic y-axis', () => {
    // Without an explicit autorange, Plotly.react under an unchanged uirevision restores the last
    // range into yaxis and turns its autorange off, freezing it at a stale or empty range.
    const axes = buildMultiYAxes(['A', 'B', 'C']);
    expect(Object.values(axes).every((axis) => axis.autorange === true)).toBeTrue();
  });

  it('colours each per-topic y-axis like its line', () => {
    const layout = buildLayout({ ...base, multipleYAxes: true, seriesNames: ['A 0', 'B 0'] });
    expect(layout.colorway).toEqual(SERIES_COLORS);
    expect(layout.yaxis?.color).toBe(SERIES_COLORS[0]);
    expect(layout.yaxis2?.color).toBe(SERIES_COLORS[1]);
    expect(layout.yaxis2?.title?.font?.color).toBe(SERIES_COLORS[1]);
  });

  it('gives stacked y-axes their own round ticks, not ticks synced to the first axis', () => {
    // Synced ticks land on values like 61.913, whose changing widths shift the plot every frame.
    const axes = buildMultiYAxes(['A', 'B']);
    expect(axes['yaxis2'].tickmode).toBe('auto');
  });

  it('drops only the single-value index from y-axis titles', () => {
    const axes = buildMultiYAxes(['BMS/Segment_Total_Volt/0 0', 'BMS/Cell/Temps 1']);
    expect(axes['yaxis'].title?.text).toBe('BMS/Segment_Total_Volt/0');
    expect(axes['yaxis2'].title?.text).toBe('BMS/Cell/Temps 1');
  });

  it('draws zero lines like grid lines, not as bright rules over the data', () => {
    const single = buildLayout(base);
    const multi = buildLayout({ ...base, multipleYAxes: true, seriesNames: ['A 0', 'B 0'] });
    [single.xaxis, single.yaxis, multi.yaxis, multi.yaxis2].forEach((axis) =>
      expect(axis?.zerolinecolor).toBe('rgba(255, 255, 255, 0.1)')
    );
  });

  it('hides tick labels and the zero line on an empty graph', () => {
    const { xaxis, yaxis } = buildLayout({ ...base, seriesNames: [] });
    expect(xaxis?.showticklabels).toBeFalse();
    expect(yaxis?.showticklabels).toBeFalse();
    expect(yaxis?.zeroline).toBeFalse();
    expect(buildLayout(base).xaxis?.showticklabels).toBeTrue();
  });

  it('shows every topic at the hovered time in one labelled box', () => {
    expect(buildLayout(base).hovermode).toBe('x unified');
  });

  it('uses the app font for chart text', () => {
    expect(buildLayout(base).font?.family).toContain('Roboto');
  });

  it('fixes the x-axis only while following live data, so a live drag zooms y alone', () => {
    // Every live frame moves the x window, which would undo a user's x zoom at once.
    expect(buildLayout({ ...base, followLive: true }).xaxis?.fixedrange).toBeTrue();
    expect(buildLayout(base).xaxis?.fixedrange).toBeFalsy();
  });

  it('resets every y-axis zoom when the y revision or the topics change', () => {
    const revisions = (options: LayoutOptions) => {
      const layout = buildLayout(options) as Record<string, { uirevision?: unknown }>;
      return Object.keys(layout)
        .filter((key) => /^yaxis\d*$/.test(key))
        .map((key) => layout[key].uirevision);
    };
    [base, { ...base, multipleYAxes: true, seriesNames: ['A 0', 'B 0'] }].forEach((options) => {
      const [first, ...rest] = revisions(options);
      expect(first).toBeDefined();
      rest.forEach((revision) => expect(revision).toBe(first));
      expect(revisions({ ...options, yRevision: 1 })[0]).not.toBe(first);
      expect(revisions({ ...options, uiRevision: 1 })[0]).not.toBe(first);
    });
  });

  it('shows full series names in hover labels', () => {
    expect(buildLayout(base).hoverlabel?.namelength).toBe(-1);
  });

  it('places no day boundary inside a single day', () => {
    const { shapes } = buildDayBoundaries({ minX: DAY_MS + 1, maxX: 2 * DAY_MS - 1 });
    expect(shapes.length).toBe(0);
  });

  it('places a boundary at each midnight between the ends', () => {
    const { shapes, annotations } = buildDayBoundaries({ minX: DAY_MS / 2, maxX: 2 * DAY_MS + 1 });
    expect(shapes.map((s) => s.x0)).toEqual([DAY_MS, 2 * DAY_MS]);
    expect(annotations[0].text).toBe('Fri, Jan 2');
  });

  describe('in a time zone behind UTC (EDT, UTC-4)', () => {
    // Karma runs in UTC, where the wall-clock shift is a no-op; fake New York's summer offset.
    beforeEach(() => spyOn(Date.prototype, 'getTimezoneOffset').and.returnValue(240));

    it('shifts x to local wall-clock time', () => {
      expect(toWallClockMs(Date.UTC(2026, 9, 21, 12))).toBe(Date.UTC(2026, 9, 21, 8));
    });

    it('places the day boundary at local midnight', () => {
      // 10/17 00:00Z to 08:00Z is 10/16 20:00 to 10/17 04:00 in New York.
      const { shapes, annotations } = buildDayBoundaries({
        minX: toWallClockMs(Date.UTC(2026, 9, 17, 0)),
        maxX: toWallClockMs(Date.UTC(2026, 9, 17, 8))
      });
      expect(shapes.map((s) => s.x0)).toEqual([Date.UTC(2026, 9, 17)]);
      expect(annotations.map((a) => a.text)).toEqual(['Sat, Oct 17']);
    });
  });
});

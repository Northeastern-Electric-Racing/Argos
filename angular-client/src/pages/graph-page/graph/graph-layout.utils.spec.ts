import { buildDayBoundaries, buildLayout, buildMultiYAxes, DAY_MS, LayoutOptions } from './graph-layout.utils';

const base: LayoutOptions = {
  seriesNames: ['A 0'],
  multipleYAxes: false,
  yMin: null,
  yMax: null,
  span: null,
  uiRevision: 0,
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
});

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

  it('autoranges only the open end when one y bound is set', () => {
    expect(buildLayout({ ...base, yMin: 5 }).yaxis).toEqual(
      jasmine.objectContaining({ autorange: 'max', range: [5, null] })
    );
    expect(buildLayout({ ...base, yMax: 5 }).yaxis).toEqual(
      jasmine.objectContaining({ autorange: 'min', range: [null, 5] })
    );
  });

  it('shrinks the x domain to make room for stacked y-axes', () => {
    const { xDomain, axes } = buildMultiYAxes(['A', 'B', 'C', 'D', 'E']);
    // Three on the left (two stacked outward), two on the right (one stacked outward).
    expect(xDomain[0]).toBeCloseTo(0.14);
    expect(xDomain[1]).toBeCloseTo(0.93);
    expect(axes['yaxis5'].position).toBeCloseTo(0);
    expect(axes['yaxis4'].position).toBeCloseTo(1);
    expect(axes['yaxis2'].overlaying).toBe('y');
    expect(axes['yaxis'].overlaying).toBeUndefined();
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

import { GRID_COL_SPANS, GRID_ROW_HEIGHTS, GRID_ROW_SPANS, gridTileClass, tileGridClass } from './grid';

// jsdom runs without Tailwind, so this checks the recipe's shape; the shots check the layout.
describe('grid recipe', () => {
  const classes = (list: string) => list.split(/\s+/);

  it("is 814's mat-grid-list: 6 columns of 1.5rem rows with 15px gutters", () => {
    expect(classes(tileGridClass()).sort()).toEqual(['auto-rows-6', 'gap-3.75', 'grid', 'grid-cols-6']);
  });

  it("takes 814's charging rows (1.2rem) as a row height, with the same columns and gutters", () => {
    expect(classes(tileGridClass({ rows: 'sm' })).sort()).toEqual(['auto-rows-[1.2rem]', 'gap-3.75', 'grid', 'grid-cols-6']);
    expect(GRID_ROW_HEIGHTS).toEqual(['md', 'sm']);
  });

  it('spans whole columns and rows, one of each, and clips by default', () => {
    for (const cols of GRID_COL_SPANS)
      for (const rows of GRID_ROW_SPANS) {
        const c = classes(gridTileClass(cols, rows));
        const span = (prefix: string) => c.filter((x) => x.startsWith(prefix)).map((x) => Number(x.slice(prefix.length)));
        expect(span('col-span-')).toEqual([cols]);
        expect(span('row-span-')).toEqual([rows]);
        expect(c).toEqual(expect.arrayContaining(['flex', 'items-center', 'justify-center', 'overflow-hidden']));
      }
  });

  it("lets a tile's content spill on request", () => {
    expect(classes(gridTileClass(3, 3, { clip: false }))).not.toContain('overflow-hidden');
  });

  it('lists the spans the pages use: the lap timer, BMS, landing and charging', () => {
    expect(GRID_COL_SPANS).toEqual([1, 2, 3, 4, 5, 6]);
    expect(GRID_ROW_SPANS).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 22]);
  });
});

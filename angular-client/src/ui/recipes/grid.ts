import { cx, tw } from './tw';

/*
 * The tile grid that replaces 814's 6-column mat-grid-list (1.5rem rows, 15px gutters): `tileGridClass` on the
 * grid, `gridTileClass(cols, rows)` on each tile. A tile spans whole columns and rows and centres its content;
 * it clips anything larger, as mat-grid-tile did, unless `{ clip: false }` (the BMS header's tiles let their
 * content spill). The span lists are complete literal classes, so Tailwind sees each one: a span no page uses
 * yet is added here, never built from a number. The lap timer and the BMS pages use it; landing (3A) takes it
 * in wave 3, and charging's 1.2rem rows would be a row-height option added then.
 */
export const tileGridClass = tw('grid auto-rows-6 grid-cols-6 gap-3.75');

const colSpans = {
  1: tw('col-span-1'),
  2: tw('col-span-2'),
  3: tw('col-span-3'),
  4: tw('col-span-4'),
  5: tw('col-span-5'),
  6: tw('col-span-6')
} as const;
const rowSpans = {
  3: tw('row-span-3'),
  4: tw('row-span-4'),
  5: tw('row-span-5'),
  6: tw('row-span-6'),
  7: tw('row-span-7'),
  8: tw('row-span-8'),
  9: tw('row-span-9'),
  10: tw('row-span-10'),
  12: tw('row-span-12'),
  14: tw('row-span-14'),
  22: tw('row-span-22')
} as const;

export type GridColSpan = keyof typeof colSpans;
export type GridRowSpan = keyof typeof rowSpans;
export const GRID_COL_SPANS = Object.keys(colSpans).map(Number) as GridColSpan[];
export const GRID_ROW_SPANS = Object.keys(rowSpans).map(Number) as GridRowSpan[];

const tileCentred = tw('flex items-center justify-center');
const tileClipped = tw('flex items-center justify-center overflow-hidden');

export function gridTileClass(cols: GridColSpan, rows: GridRowSpan, { clip = true }: { clip?: boolean } = {}): string {
  return cx(colSpans[cols], rowSpans[rows], clip ? tileClipped : tileCentred);
}

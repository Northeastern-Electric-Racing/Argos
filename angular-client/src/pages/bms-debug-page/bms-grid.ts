import { gridTileClass, tileGridClass } from 'src/ui/recipes/grid';

/**
 * The BMS pages' grid and tiles (columns × rows), from the grid recipe: 814's mat-grid-list, whose tiles these
 * pages set to overflow: visible, so content larger than a tile spills rather than clips.
 */
const spill = { clip: false };
export const bmsGrid = tileGridClass();
export const bmsTile = {
  header: gridTileClass(6, 3, spill),
  glance: gridTileClass(6, 5, spill),
  heatmap: gridTileClass(6, 8, spill),
  half: gridTileClass(3, 8, spill),
  halfTall: gridTileClass(3, 10, spill)
} as const;

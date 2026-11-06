import { gridTileClass, tileGridClass } from 'src/ui/recipes/grid';

/** The BMS pages' grid and tiles (columns × rows), from the grid recipe: 814's mat-grid-list, tiles that clip. */
export const bmsGrid = tileGridClass();
export const bmsTile = {
  header: gridTileClass(6, 3),
  glance: gridTileClass(6, 5),
  heatmap: gridTileClass(6, 8),
  half: gridTileClass(3, 8),
  halfTall: gridTileClass(3, 10)
} as const;

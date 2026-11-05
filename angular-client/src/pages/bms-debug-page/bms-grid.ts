import { cx, tw } from 'src/ui/recipes/tw';

/**
 * The BMS pages' tiles, from 814's 6-column mat-grid-list (1.5rem rows, 15px gutters): the grid is
 * `grid auto-rows-6 grid-cols-6 gap-3.75`, and each tile spans whole columns and rows, centres its content and
 * clips it, as mat-grid-tile did. Complete class lists per span, so Tailwind sees every one.
 */
const cell = tw('flex items-center justify-center overflow-hidden');
export const bmsTile = {
  header: cx(tw('col-span-6 row-span-3'), cell),
  glance: cx(tw('col-span-6 row-span-5'), cell),
  heatmap: cx(tw('col-span-6 row-span-8'), cell),
  half: cx(tw('col-span-3 row-span-8'), cell),
  halfTall: cx(tw('col-span-3 row-span-10'), cell)
} as const;

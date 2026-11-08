import { tileGridClass } from 'src/ui/recipes/grid';
import { cx, tw } from 'src/ui/recipes/tw';

/**
 * The charging page's desktop layout: the tile grid recipe with 814's 1.2rem rows for its 30 rows: the 12-row
 * status band, then three 6-row graph cards (1.5rem rows would make every card 20% taller).
 */
export const chargingGridClass = tileGridClass({ rows: 'sm' });

/**
 * A fault row: faults alternate between an orange fill with black text and a dim orange tint with the label
 * grey, and each fault keeps its fill as new ones arrive. Both pairs pass AA.
 */
export const faultRowClasses = {
  lit: tw('w-full rounded-xs bg-danger text-on-status'),
  dim: tw('w-full rounded-xs bg-danger/10 text-fg-label')
} as const;

/** A status card's light: an outlined ring while off, filled with the state's colour (3:1 on the card) while on. */
const lightBase = tw('h-10 w-10 rounded-full border-3 border-solid');
export const statusLightClasses = {
  off: cx(lightBase, tw('border-fg')),
  active: cx(lightBase, tw('border-success bg-success')),
  faulted: cx(lightBase, tw('border-accent bg-accent')),
  charging: cx(lightBase, tw('border-warn bg-warn')),
  balancing: cx(lightBase, tw('border-info bg-info'))
} as const;

import { tw } from './tw';

/**
 * A number input on the uiInput atom (`<input uiInput="sm" type="number" [class]="numberInputClass('sm')">`):
 * a fixed width that fits its values, with tabular figures so digits don't shift as they change.
 *   xs    64px, a y-axis bound ("Auto", or up to 4 decimals)
 *   sm    80px (70px on phones), a range in seconds or points
 *   fill  the container's width, for an input of any size in a grid or column cell (car commands and settings)
 * Range limits (min, step) are the template's attributes, as on any native number input. xs and sm are for
 * `uiInput="sm"`, whose 8px padding they keep.
 */
export const NUMBER_INPUT_WIDTHS = ['xs', 'sm', 'fill'] as const;
export type NumberInputWidth = (typeof NUMBER_INPUT_WIDTHS)[number];

const numberInputClasses: Record<NumberInputWidth, string> = {
  xs: tw('w-16 tabular-nums'),
  sm: tw('w-20 tabular-nums max-md:w-17.5'),
  fill: tw('w-full tabular-nums')
};

export function numberInputClass(width: NumberInputWidth = 'sm'): string {
  return numberInputClasses[width];
}

import { tw } from '../recipes/tw';

/*
 * Slice 1C's recipes: the segmented look shared by Aria tabs and segmented controls, and the number input.
 * They live next to the datetime input (the field 1C owns) until the fix step moves them into
 * src/ui/recipes/{segmented,number-input}.ts; import them from here until then.
 */

/**
 * The segmented look: a row of equal segments on a sunken surface, the chosen one solid telemetry blue.
 * - Aria tabs: `list` on the ngTabList, `item` on each ngTab (aria-selected), `panel` on each ngTabPanel.
 *   The panel lays out as a flex column and `inert:hidden` takes an inert (unselected) panel out of the layout,
 *   so no panel display can keep it on screen (lesson 3).
 * - A segmented control of toggle buttons: `list` on the group, `item` on each button (aria-pressed).
 */
export const segmentedClasses = {
  list: tw('flex gap-0.5 rounded-md border border-solid border-border bg-surface-1 p-0.5'),
  item: tw(
    'inline-flex min-h-6 flex-1 cursor-pointer items-center justify-center rounded-sm px-3 font-sans text-ctrl-sm font-semibold text-fg-muted transition-colors duration-120 outline-none select-none not-aria-selected:not-aria-pressed:hover:bg-fg/8 not-aria-selected:not-aria-pressed:hover:text-fg focus-visible:focus-ring focus-visible:outline-offset-1 aria-pressed:bg-secondary aria-pressed:text-on-accent aria-selected:bg-secondary aria-selected:text-on-accent'
  ),
  panel: tw('flex flex-col gap-3 inert:hidden')
} as const;

/**
 * A number input on the uiInput atom (`<input uiInput="sm" type="number" [class]="numberInputClass('sm')">`):
 * a fixed width that fits its values, with tabular figures so digits don't shift as they change.
 *   xs  64px, a y-axis bound ("Auto", or up to 4 decimals)
 *   sm  80px (70px on phones), a range in seconds or points
 * Range limits (min, step) are the template's attributes, as on any native number input. Both widths are for
 * `uiInput="sm"`; `pl-2 pr-2` restore its 8px padding, which the field recipe's base `px-3` beats today (handoff).
 */
export const NUMBER_INPUT_WIDTHS = ['xs', 'sm'] as const;
export type NumberInputWidth = (typeof NUMBER_INPUT_WIDTHS)[number];

const numberInputClasses: Record<NumberInputWidth, string> = {
  xs: tw('w-16 pr-2 pl-2 tabular-nums'),
  sm: tw('w-20 pr-2 pl-2 tabular-nums max-md:w-17.5')
};

export function numberInputClass(width: NumberInputWidth = 'sm'): string {
  return numberInputClasses[width];
}

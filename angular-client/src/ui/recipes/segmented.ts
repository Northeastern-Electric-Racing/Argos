import { tw } from './tw';

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

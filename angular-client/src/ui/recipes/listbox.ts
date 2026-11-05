import { cx, tw } from './tw';

/**
 * The listbox popup shared by ui-select and the add-rule topic autocomplete (Aria combobox + listbox in a
 * CDK connected overlay). Options take their state from what Aria sets: `aria-selected` (accent tint, and
 * the check mark of a select option), `data-active` (the keyboard's active option, a solid inset ring).
 *   width   fill: as wide as the trigger (autocomplete); grow: at least the trigger, wider for a long option
 *   size    md (13px) or sm (12px), matching the trigger's size
 */
export const LISTBOX_SIZES = ['md', 'sm'] as const;
export type ListboxSize = (typeof LISTBOX_SIZES)[number];
export const LISTBOX_WIDTHS = ['fill', 'grow'] as const;
export type ListboxWidth = (typeof LISTBOX_WIDTHS)[number];

const popupBase = tw(
  'mt-1 box-border max-h-64 animate-pop-in overflow-auto rounded-md border border-solid border-border bg-surface-2 p-1 text-fg shadow-overlay'
);
const popupWidthClasses: Record<ListboxWidth, string> = {
  fill: tw('w-full'),
  grow: tw('w-max max-w-[calc(100vw-32px)] min-w-full shrink-0')
};
const popupSizeClasses: Record<ListboxSize, string> = {
  md: tw('text-ctrl-sm'),
  sm: tw('text-xs')
};

/** The popup surface around the listbox. */
export function listboxPopupClass(width: ListboxWidth = 'fill', size: ListboxSize = 'md'): string {
  return cx(popupBase, popupWidthClasses[width], popupSizeClasses[size]);
}

export const listboxClasses = {
  /** The `ngListbox` element inside the popup. */
  listbox: tw('flex flex-col gap-0.5 outline-none'),
  /**
   * One `ngOption`. A `group/option`, so its check mark can follow aria-selected. No `outline-none`: options never
   * take DOM focus (activedescendant), and it would clear the style the data-active `outline-2` draws with.
   */
  option: tw(
    'group/option flex min-h-8 cursor-pointer items-center gap-2 truncate rounded-sm px-3 hover:bg-fg/8 aria-selected:bg-accent/18 aria-selected:text-accent-text data-[active=true]:outline-2 data-[active=true]:-outline-offset-2 data-[active=true]:outline-focus'
  ),
  /** The option's label, ellipsed when it doesn't fit. */
  optionText: tw('truncate'),
  /** The check mark after a select option, shown only on the selected one (pair it with iconClasses.xs). */
  optionCheck: tw('invisible ml-auto group-aria-selected/option:visible'),
  /** The "No options" line. */
  empty: tw('px-3 py-2 text-fg-muted')
} as const;

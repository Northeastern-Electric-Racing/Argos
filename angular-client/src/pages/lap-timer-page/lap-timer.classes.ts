import { tw } from 'src/ui/recipes/tw';

/**
 * Looks the lap timer's components share: the hero's and the session summary's labels and numerals, and the
 * two tables' scroll box. The tables keep #909's light header (the table recipe's `lightHeaderCellClass`); body
 * cells are the table recipe's where they match (laps), with the sessions table's tighter 6px rows.
 */
export const lapTimerClasses = {
  /** TOTAL, LAP n, LAPS: 12px semibold uppercase, fg-muted (AA on the panel). */
  heroLabel: tw('font-sans text-xs font-semibold tracking-[2px] text-fg-muted uppercase'),
  /** The hero's total (64px, as on #909). */
  total: tw('font-sans text-timer leading-none font-bold text-fg tabular-nums'),
  /** The session summary's lap count (56px, as on #909). */
  lapCount: tw('text-center font-sans text-timer-sm leading-none font-bold text-fg tabular-nums'),
  divider: tw('border-t border-solid border-border'),
  /**
   * The scroll box of a table: it fills the card and scrolls both ways inside it, never the page (Spartan).
   * `relative` makes it the containing block of the cells' sr-only labels, which would otherwise widen the page.
   */
  tableWrap: tw(
    'relative min-h-0 w-full flex-1 [scrollbar-width:thin] [scrollbar-color:var(--color-border)_transparent] overflow-auto'
  ),
  table: tw('w-full border-collapse font-sans text-sm text-fg')
} as const;

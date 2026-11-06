import { tw } from 'src/ui/recipes/tw';

/**
 * The eFuses page's panel hardware: annunciator plates, push-button switches, the lock and the RTDS buttons share
 * one look (dark plate, 4px corners, Highway Gothic legends). Page-local: no other page draws these.
 */

/**
 * A row of push buttons on one base: the eFuse switch, the lock, the RTDS commands. The 1px gaps show the base as
 * the seams between buttons, in a row or wrapped onto a grid on phones.
 */
export const panelGroupClass = tw('inline-flex gap-px overflow-hidden rounded-[4px] border border-surface-3 bg-surface-2');

/**
 * One push button in a group: it sinks 1px on hover and 3px while pressed (aria-pressed, or :active for the
 * one-shot RTDS buttons). A pressed button also lights a 3px bar along its top edge in its own text colour (a
 * bottom one would sink out of the clipped group): its tinted fill is only about 1.5:1 from an unpressed one,
 * the bar is 4.5:1 or more (WCAG 1.4.11). The group clips its overflow, so the focus indicator is drawn inside.
 * Each button sets its own padding, colours (an opaque surface-1, or a tint over the base) and font size.
 */
export const panelButtonClass = tw(
  'relative inline-flex cursor-pointer items-center justify-center border-0 transition-transform duration-100 select-none not-aria-pressed:hover:translate-y-px focus-visible:focus-ring focus-visible:-outline-offset-2 disabled:pointer-events-none disabled:opacity-65 aria-pressed:translate-y-[3px] aria-pressed:shadow-[inset_0_3px_0_currentColor]'
);

/** The engraved legend on plates and buttons. */
export const legendClass = tw('font-highway font-normal tracking-widest uppercase');

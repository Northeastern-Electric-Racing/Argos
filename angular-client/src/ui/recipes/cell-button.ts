import { tw } from './tw';

/**
 * A table cell's action as a real button (the Name cell of the fault tables and BMS chip faults): it reads as the cell's text, underlines
 * on hover, tints while pressed (p-ripple's stand-in, Q8) and takes the solid focus ring, so keyboard and
 * screen-reader users reach what a row click does. It sets the cell's font itself, since the base shim gives
 * unmigrated buttons the browser's control font. 6px of padding, taken back by a negative margin, makes it a
 * 24px+ target (WCAG 2.5.8) without changing the row's height. Replaces legacy `.ui-cell-button`.
 */
export const cellButtonClass = tw(
  '-my-1.5 cursor-pointer rounded-xs border-0 bg-transparent px-0 py-1.5 text-left text-inherit [font:inherit] hover:underline focus-visible:focus-ring active:bg-fg/8'
);

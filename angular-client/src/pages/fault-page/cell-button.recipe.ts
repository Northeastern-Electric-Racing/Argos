import { tw } from 'src/ui/recipes/tw';

/**
 * A table cell's action as a real button (the fault tables' Name cell): it reads as the cell's text, underlines
 * on hover, tints while pressed (p-ripple's stand-in, Q8) and takes the solid focus ring, so keyboard and
 * screen-reader users reach what a row click does. It sets the cell's font itself, since the base shim gives
 * unmigrated buttons the browser's control font. Replaces legacy `.ui-cell-button`.
 */
export const cellButtonClass = tw(
  'm-0 cursor-pointer rounded-xs border-0 bg-transparent p-0 text-left text-inherit [font:inherit] hover:underline focus-visible:focus-ring active:bg-fg/8'
);

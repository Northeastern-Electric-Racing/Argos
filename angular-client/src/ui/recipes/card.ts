import { cx, tw } from './tw';

/**
 * The card (info-background): a rounded panel that fills its grid tile. The fill colour is the component's
 * backgroundColor input (a style binding, default the panel token's #2c2c2c). `fill` makes it a column so a
 * child with `flex-1` takes the remaining height; `sliced` makes room for the clipped upper-left corner.
 */
const cardBase = tw('h-full w-full rounded-md');
const cardDisplay = { block: tw('inline-block'), fill: tw('flex flex-col') };
const cardPadding = { plain: tw('p-3'), sliced: tw('pt-[15px] pr-3 pb-3 pl-[15px]') };

export function cardClass({ fill = false, sliced = false } = {}): string {
  return cx(cardBase, fill ? cardDisplay.fill : cardDisplay.block, sliced ? cardPadding.sliced : cardPadding.plain);
}

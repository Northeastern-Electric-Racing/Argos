import { tw } from './tw';

/**
 * mat-icon sizes. Material's `.mat-icon` rule (24px box) is unlayered, so it beats every Tailwind utility;
 * the important modifier is the one documented exception to "no !", and only on mat-icon, through this recipe.
 * Each size sets the box and the font size, so svgIcon and font (ligature) icons match.
 * Colour: icons inherit currentColor, so colour the parent; Material's own `mat-icon { color }` rule is
 * unlayered too.
 */
export const ICON_SIZES = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
export type IconSize = (typeof ICON_SIZES)[number];

export const iconClasses: Record<IconSize, string> = {
  xs: tw('size-4! text-[16px]!'),
  sm: tw('size-4.5! text-[18px]!'),
  md: tw('size-5! text-[20px]!'),
  lg: tw('size-6! text-[24px]!'),
  xl: tw('size-9! text-[36px]!')
};

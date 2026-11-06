import { tw } from './tw';

/**
 * Icon sizes, for `<ui-icon [size]>` (src/ui/icon). Each sets the box and the font size, so SVG and font
 * (ligature) icons match. `inline` takes the box, font size and line height from the parent: a sized wrapper
 * (the nav's 48px icons, the bell's 32px) or the text around it. An unsized icon is 24px.
 * Colour: an icon draws in currentColor, so a `text-*` class on it or on its parent colours it.
 */
export const ICON_SIZES = ['xs', 'sm', 'md', 'lg', 'xl', 'inline'] as const;
export type IconSize = (typeof ICON_SIZES)[number];

export const iconClasses: Record<IconSize, string> = {
  xs: tw('size-4 text-[16px]'),
  sm: tw('size-4.5 text-[18px]'),
  md: tw('size-5 text-[20px]'),
  lg: tw('size-6 text-[24px]'),
  xl: tw('size-9 text-[36px]'),
  inline: tw('h-[inherit] w-[inherit] text-[length:inherit] leading-[inherit]')
};

/** An unsized icon: 24px at zero specificity, so any size or font-size utility on it wins. */
export const iconDefaultSizeClass = tw('[:where(&)]:size-6 [:where(&)]:text-[24px]');

/** Every icon: an inline box that clips, draws SVG paths in currentColor and can't be selected. */
export const iconBaseClass = tw('inline-block overflow-hidden fill-current select-none');

/**
 * A ligature icon's font (the Material Icons face, styles/material-icons.scss): the glyph is the word, so the
 * text around it must not restyle it. The line height is 1, except inline, which inherits it.
 */
export const iconFontClass = tw(
  'font-icons font-normal tracking-normal wrap-normal whitespace-nowrap normal-case not-italic antialiased'
);
export const iconFontLeadingClass = tw('leading-none');

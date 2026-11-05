import { cx, tw } from './tw';

/**
 * The button recipe: one base, a variant and a size, each a complete literal class list (Tailwind only sees
 * whole class names, so never build one from parts). Hover, focus and disabled behave the same everywhere:
 *   primary      filled NER red, the page's main action
 *   secondary    filled telemetry blue, applying a setting
 *   tonal        blue-tinted surface with a blue edge, the graph page's toggles and tools; solid blue
 *                while aria-pressed="true", so on and off read apart (lesson 8)
 *   neutral      raised grey, secondary actions such as upload or download
 *   outlined     accent edge only
 *   text         no fill or edge, such as Cancel
 *   success/warn filled status colours, the lap timer's start and pause
 *   danger       orange edge, never filled, for destructive actions
 *   danger-text  orange text with no edge, for a destructive action in a row or list (Clear, Delete)
 * Sizes: md is the default control height (36px); sm is compact (28px, 32px on phones); lg is the legacy
 * 140x45 footprint (44px tall on phones), which some pages are laid out around; lg-fluid is lg on wide
 * screens and as wide as its label on phones (12px padding), so a row of them wraps less (the rules page);
 * icon is a 32px square for an icon-only button.
 */
export const BUTTON_VARIANTS = [
  'primary',
  'secondary',
  'tonal',
  'neutral',
  'outlined',
  'text',
  'success',
  'warn',
  'danger',
  'danger-text'
] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

export const BUTTON_SIZES = ['sm', 'md', 'lg', 'lg-fluid', 'icon'] as const;
export type ButtonSize = (typeof BUTTON_SIZES)[number];

const buttonBase = tw(
  'inline-flex cursor-pointer items-center justify-center gap-2 border border-solid text-center font-sans leading-control font-semibold whitespace-nowrap transition-colors duration-120 select-none focus-visible:focus-ring disabled:cursor-not-allowed disabled:opacity-50 [&_.material-icons]:text-ctrl-lg'
);

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: tw(
    'border-accent-strong bg-accent-strong text-on-accent not-disabled:hover:border-accent-strong-hover not-disabled:hover:bg-accent-strong-hover'
  ),
  secondary: tw('border-secondary-border bg-secondary text-on-accent not-disabled:hover:bg-secondary-hover'),
  tonal: tw(
    'border-secondary-border/70 bg-secondary-soft text-fg not-disabled:hover:border-secondary-border not-disabled:hover:bg-secondary-soft-hover aria-pressed:border-secondary-border aria-pressed:bg-secondary aria-pressed:text-on-accent aria-pressed:not-disabled:hover:bg-secondary-hover'
  ),
  neutral: tw(
    'border-border bg-surface-3 text-fg not-disabled:hover:border-border-strong not-disabled:hover:bg-surface-3-hover'
  ),
  outlined: tw(
    'border-accent bg-transparent text-accent-fg not-disabled:hover:border-accent-hover not-disabled:hover:bg-accent/18'
  ),
  text: tw('border-transparent bg-transparent text-fg not-disabled:hover:bg-fg/8'),
  success: tw(
    'border-success bg-success text-on-status not-disabled:hover:border-success-hover not-disabled:hover:bg-success-hover'
  ),
  warn: tw('border-warn bg-warn text-on-status not-disabled:hover:border-warn-hover not-disabled:hover:bg-warn-hover'),
  danger: tw('border-danger bg-transparent text-danger not-disabled:hover:bg-danger/16'),
  'danger-text': tw('border-transparent bg-transparent text-danger not-disabled:hover:bg-danger/16')
};

export const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: tw('min-h-7 rounded-sm px-3 text-xs max-md:min-h-8'),
  md: tw('min-h-9 rounded-md px-4 text-ctrl'),
  lg: tw('min-h-11.25 min-w-35 rounded-md px-4 text-ctrl max-md:min-h-11'),
  'lg-fluid': tw('min-h-11.25 min-w-35 rounded-md px-4 text-ctrl max-md:min-h-11 max-md:min-w-0 max-md:px-3'),
  icon: tw('min-h-8 w-8 rounded-md p-0 text-ctrl')
};

/** The classes for a button of this variant and size. */
export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md'): string {
  return cx(buttonBase, buttonVariantClasses[variant], buttonSizeClasses[size]);
}

/** A round, borderless icon-only button (dialog, drawer and toast close): muted until hovered. */
export const ICON_BUTTON_SIZES = ['sm', 'md'] as const;
export type IconButtonSize = (typeof ICON_BUTTON_SIZES)[number];

const iconButtonBase = tw(
  'inline-grid cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 text-fg-muted hover:bg-fg/10 hover:text-fg focus-visible:focus-ring'
);
const iconButtonSizeClasses: Record<IconButtonSize, string> = {
  sm: tw('size-7 [&_mat-icon]:size-4.5! [&_mat-icon]:text-[18px]!'),
  md: tw('size-8')
};

export function iconButtonClass(size: IconButtonSize = 'md'): string {
  return cx(iconButtonBase, iconButtonSizeClasses[size]);
}

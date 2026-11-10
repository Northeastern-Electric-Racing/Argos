import { cx, tw } from './tw';

/**
 * Form fields: a text, number or date input (`input[uiInput]`), its label (`label[uiLabel]`), the hint and
 * error lines under it, and the wrappers. Invalid state comes from aria-invalid="true" (set it with
 * aria-describedby pointing at the error, so screen readers announce it) or from Angular's ng-invalid.ng-touched.
 * Width is layout: the consumer adds `w-full` (or a grid/flex class) to the input or its field.
 */
export const INPUT_SIZES = ['sm', 'md'] as const;
export type InputSize = (typeof INPUT_SIZES)[number];

/*
 * The base sets no padding, height or radius: Tailwind orders utilities by its own rules, not by their order in
 * `class`, so a base `px-3` beside a size's `px-2` is decided by the stylesheet. Each size sets all three.
 * Focus is the neutral edge plus a 1px outline outside it (2px in all), as on ui-select. The edge is control-border,
 * 3:1 on every surface up to surface-3 (WCAG 1.4.11; #909's hairline border measured 1.24 to 1.86). Text is 16px at
 * both sizes, as PrimeNG's inputs were; smaller text makes iOS Safari zoom the page on focus.
 */
const inputBase = tw(
  'border border-solid border-control-border bg-surface-1 font-sans text-fg transition-[border-color] duration-120 placeholder:text-fg-muted hover:border-control-border-hover focus:border-focus focus:outline-1 focus:outline-focus disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-danger aria-invalid:focus:outline-danger [&.ng-invalid.ng-touched]:border-danger [&.ng-invalid.ng-touched]:focus:outline-danger'
);
const inputSizeClasses: Record<InputSize, string> = {
  sm: tw('h-7 rounded-sm px-2 text-base'),
  md: tw('h-9 rounded-md px-3 text-base')
};

/** The classes for an input of this size. */
export function inputClass(size: InputSize = 'md'): string {
  return cx(inputBase, inputSizeClasses[size]);
}

export const fieldClasses = {
  /** A vertical form: fields 16px apart. */
  form: tw('flex flex-col gap-4'),
  /** One field: label, control, then hint or error, 4px apart. */
  field: tw('flex min-w-0 flex-col gap-1'),
  label: tw('text-ctrl-sm font-semibold text-fg-label'),
  /** The visual required mark inside a label; aria-hidden, since the control's aria-required speaks for it. */
  required: tw('ml-[0.15em] text-danger'),
  hint: tw('text-xs text-fg-muted'),
  error: tw('text-xs text-danger'),
  /** The row of buttons that ends a form, right-aligned. */
  actions: tw('mt-2 flex flex-wrap justify-end gap-2')
} as const;

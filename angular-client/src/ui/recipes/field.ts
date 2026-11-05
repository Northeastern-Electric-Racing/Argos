import { cx, tw } from './tw';

/**
 * Form fields: a text, number or date input (`input[uiInput]`), its label (`label[uiLabel]`), the hint and
 * error lines under it, and the wrappers. Invalid state comes from aria-invalid="true" (set it with
 * aria-describedby pointing at the error, lesson 7) or from Angular's ng-invalid.ng-touched.
 * Width is layout: the consumer adds `w-full` (or a grid/flex class) to the input or its field.
 */
export const INPUT_SIZES = ['sm', 'md'] as const;
export type InputSize = (typeof INPUT_SIZES)[number];

const inputBase = tw(
  'rounded-md border border-solid border-border bg-surface-1 px-3 font-sans text-fg transition-[border-color,box-shadow] duration-120 placeholder:text-fg-muted hover:border-border-strong focus:border-focus focus:ring-1 focus:ring-focus focus:outline-none disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-danger aria-invalid:focus:ring-danger [&.ng-invalid.ng-touched]:border-danger [&.ng-invalid.ng-touched]:focus:ring-danger'
);
const inputSizeClasses: Record<InputSize, string> = {
  sm: tw('h-7 rounded-sm px-2 text-ctrl-sm'),
  md: tw('h-9 text-ctrl')
};

/** The classes for an input (or a textarea, which grows with its rows) of this size. */
export function inputClass(size: InputSize = 'md', element: 'input' | 'textarea' = 'input'): string {
  return cx(inputBase, inputSizeClasses[size], element === 'textarea' && tw('h-auto py-2'));
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

import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';

/** `lg` keeps the legacy 140x45 footprint; `sm` is the compact toolbar size. */
export type ButtonSize = 'lg' | 'sm';

/** The design-system button variants in src/ui/ui.css; 'primary' is the plain .ui-button. */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tonal'
  | 'neutral'
  | 'outlined'
  | 'text'
  | 'success'
  | 'warn'
  | 'danger';

/** The design-system classes for a button of this variant and size, shared by argos-button and toast-button. */
export function buttonClass(variant: ButtonVariant, size: ButtonSize): string {
  const classes = ['ui-button', `ui-button--${size}`];
  if (variant !== 'primary') classes.push(`ui-button--${variant}`);
  return classes.join(' ');
}

/**
 * The app's labelled button: a native button styled by the design system's .ui-button.
 * Pick the look with `variant` and `size`; `additionalStyles` is for layout only (width, margins).
 */
@Component({
  selector: 'argos-button',
  templateUrl: './argos-button.component.html',
  styleUrls: ['./argos-button.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class ButtonComponent {
  label = input.required<string>();
  // Event is optional so callers can pass either `() => void` or `(event: Event) => void`;
  // popover/menu triggers need the event for anchoring.
  onClick = input.required<(event?: Event) => void>();
  additionalStyles = input<string>();
  disabled = input<boolean>(false);
  size = input<ButtonSize>('lg');
  variant = input<ButtonVariant>('primary');
  /** For buttons that open a popup: its kind, and whether it is open. */
  ariaHaspopup = input<'dialog' | 'menu' | 'listbox' | undefined>(undefined);
  ariaExpanded = input<boolean | undefined>(undefined);
  /** For on/off toggles whose label stays the same: whether it is on (aria-pressed). */
  ariaPressed = input<boolean | undefined>(undefined);
  cssClass = computed(() => buttonClass(this.variant(), this.size()));
}

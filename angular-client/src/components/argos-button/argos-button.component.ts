import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { UiButtonDirective } from 'src/ui/button/button.directive';
import { ButtonSize, ButtonVariant } from 'src/ui/recipes/button';

export type { ButtonSize, ButtonVariant } from 'src/ui/recipes/button';

/**
 * The app's labelled button: a native button styled by the button recipe (src/ui/recipes/button.ts).
 * Pick the look with `variant` and `size` (lg, the legacy 140x45 footprint, by default). Layout goes in a
 * class on <argos-button>; `additionalStyles` is the legacy inline-style hook, for layout only.
 */
@Component({
  selector: 'argos-button',
  templateUrl: './argos-button.component.html',
  imports: [UiButtonDirective],
  host: { class: 'inline-flex' },
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
}

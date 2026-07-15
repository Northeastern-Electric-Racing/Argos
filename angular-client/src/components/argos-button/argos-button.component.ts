import { Component, computed, input } from '@angular/core';

export type ButtonSize = 'default' | 'sm';

/**
 * Simple custom button component that does something on click
 * Takes label and onClick function as inputs
 * Currently has one set button style but can be expanded to have more customizable styles
 */
@Component({
  selector: 'argos-button',
  templateUrl: './argos-button.component.html',
  styleUrls: ['./argos-button.component.css'],
  standalone: true
})
export class ButtonComponent {
  label = input.required<string>();
  // Event is optional so callers can pass either `() => void` or `(event: Event) => void`;
  // popover/menu triggers need the event for anchoring.
  onClick = input.required<(event?: Event) => void>();
  additionalStyles = input<string>();
  disabled = input<boolean>(false);
  size = input<ButtonSize>('default');
  cssClass = computed(() => `btn btn--${this.size()}`);
  style = computed(() => {
    // The default size keeps the legacy fixed footprint; sm lets CSS drive sizing
    // so callers don't need to override width/height per-button.
    const base = this.size() === 'sm' ? '' : 'width: 140px; height: 45px; ';
    const extra = this.additionalStyles();
    return extra ? base + extra : base;
  });
}

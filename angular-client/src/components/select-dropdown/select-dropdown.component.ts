import { Component, effect, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { HlmSelectImports } from '@spartan-ng/helm/select';

export interface SelectorConfig {
  options: DropdownOption[];
  placeholder: string;
  defaultValue?: string;
}
export interface DropdownOption {
  name: string;
  function: () => void;
}

@Component({
  selector: 'select-dropdown',
  templateUrl: './select-dropdown.component.html',
  styleUrl: './select-dropdown.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [HlmSelectImports]
})
export class SelectDropdownComponent {
  options = input<DropdownOption[]>([
    {
      name: 'default',
      function: () => {
        console.log('Default option function called...');
      }
    }
  ]);
  placeholder = input<string>('placeholder');
  defaultValue = input<string | undefined>(undefined);

  /** Name of the shown option; option names double as the select's values. */
  selectedName = signal<string | null>(null);

  constructor() {
    // The dropdown's selected display tracks `defaultValue`:
    //  - when `defaultValue` matches an option name, that option is shown
    //  - when `defaultValue` is undefined, the placeholder is restored
    // The clear-on-undefined branch matters for parents that toggle the prop dynamically
    // (e.g. graph-page deselects the active preset when a Custom range is applied). Static
    // callers that never unset `defaultValue` see no behavior change.
    effect(() => {
      const val = this.defaultValue();
      if (val) {
        const match = this.options().find((option) => option.name === val);
        if (match) {
          this.selectedName.set(match.name);
        }
      } else {
        this.selectedName.set(null);
      }
    });
  }

  handleChangedOption(name: string | null | undefined) {
    this.selectedName.set(name ?? null);
    this.options()
      .find((option) => option.name === name)
      ?.function();
  }

  // Get display text for the dropdown
  getDisplayText(): string {
    const defaultValue = this.defaultValue();
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    return this.selectedName() ?? this.placeholder();
  }
}

import { Component, computed, effect, input, ChangeDetectionStrategy } from '@angular/core';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

export interface SelectorConfig {
  options: DropdownOption[];
  placeholder: string;
  defaultValue?: string;
}
export interface DropdownOption {
  name: string;
  function: () => void;
}

let nextId = 0;

@Component({
  selector: 'select-dropdown',
  templateUrl: './select-dropdown.component.html',
  styleUrl: './select-dropdown.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [NzSelectModule, ReactiveFormsModule, FormsModule]
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
  /** Accessible name for the select; defaults to the placeholder, which callers use as its caption. */
  label = input<string | undefined>(undefined);
  accessibleName = computed(() => this.label() ?? this.placeholder());
  readonly inputId = `select-dropdown-${nextId++}`;

  selectedOption: DropdownOption | undefined;

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
          this.selectedOption = match;
        }
      } else {
        this.selectedOption = undefined;
      }
    });
  }

  // Options are keyed by name; ngModelChange only fires on user picks, not when defaultValue sets the model.
  handleChangedOption(name: string) {
    const option = this.options().find((o) => o.name === name);
    this.selectedOption = option;
    option?.function();
  }

  // Get display text for the dropdown
  getDisplayText(): string {
    const defaultValue = this.defaultValue();
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    return this.selectedOption ? this.selectedOption.name : this.placeholder();
  }
}

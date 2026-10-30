import { Component, effect, input, ChangeDetectionStrategy } from '@angular/core';
import { MatFormField } from '@angular/material/form-field';
import { MatOption, MatSelect, MatSelectChange } from '@angular/material/select';
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

@Component({
  selector: 'select-dropdown',
  templateUrl: './select-dropdown.component.html',
  styleUrl: './select-dropdown.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatFormField, MatSelect, MatOption, ReactiveFormsModule, FormsModule]
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
  /** Accessible name; the compact field has no floating label, so this falls back to the placeholder. */
  label = input<string | undefined>(undefined);
  defaultValue = input<string | undefined>(undefined);
  /** mat-select's panelWidth: 'auto' matches the trigger; null grows the panel to the longest option. */
  panelWidth = input<MatSelect['panelWidth']>('auto');

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

  handleChangedOption(changeEvent: MatSelectChange<DropdownOption>) {
    changeEvent.value.function();
  }

  // Options are rebuilt by parents on every change, so match them by name rather than identity.
  compareOptions = (a: DropdownOption | undefined, b: DropdownOption | undefined) => a?.name === b?.name;

  // Get display text for the dropdown
  getDisplayText(): string {
    const defaultValue = this.defaultValue();
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    return this.selectedOption ? this.selectedOption.name : this.placeholder();
  }
}

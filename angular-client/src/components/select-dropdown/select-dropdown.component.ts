import { Component, effect, input, ChangeDetectionStrategy } from '@angular/core';
import { UiSelectComponent } from 'src/ui/select/select.component';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

export interface SelectorConfig {
  options: DropdownOption[];
  placeholder: string;
  defaultValue?: string;
  /** The select's accessible name, its purpose ("Segment 3 heat map view"); without one it is named by its placeholder. */
  ariaLabel?: string;
}
export interface DropdownOption {
  name: string;
  function: () => void;
}

@Component({
  selector: 'select-dropdown',
  templateUrl: './select-dropdown.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  host: { class: 'inline-block' },
  imports: [UiSelectComponent, ReactiveFormsModule, FormsModule]
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
  /** The select's accessible name: what it is for, never its value or placeholder. Falls back to the placeholder. */
  ariaLabel = input<string | undefined>(undefined);
  defaultValue = input<string | undefined>(undefined);

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

  handleChangedOption(option: DropdownOption) {
    option.function();
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

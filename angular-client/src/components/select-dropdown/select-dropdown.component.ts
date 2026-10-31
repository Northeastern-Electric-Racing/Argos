import { Component, effect, input, ChangeDetectionStrategy } from '@angular/core';
import { TuiDropdown, TuiTextfield } from '@taiga-ui/core';
import { TuiChevron, TuiDataListWrapper, TuiSelect } from '@taiga-ui/kit';
import { FormsModule } from '@angular/forms';

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
  imports: [TuiTextfield, TuiDropdown, TuiChevron, TuiDataListWrapper, TuiSelect, FormsModule]
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

  readonly stringify = (option: DropdownOption) => option.name;
  readonly identityMatcher = (a: DropdownOption, b: DropdownOption) => a.name === b.name;

  handleChangedOption(option: DropdownOption | null) {
    this.selectedOption = option ?? undefined;
    option?.function();
  }
}

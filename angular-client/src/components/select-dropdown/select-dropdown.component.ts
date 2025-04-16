import { Component, input, OnInit } from '@angular/core';
import { SelectChangeEvent } from 'primeng/select';

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
  styleUrl: './select-dropdown.component.css'
})
export class SelectDropdownComponent implements OnInit {
  constructor() {}
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

  ngOnInit() {
    if (this.defaultValue()) {
      const defaultOption = this.options().find((option) => option.name === this.defaultValue());
      if (defaultOption) {
        this.selectedOption = defaultOption;
      }
    }
  }

  handleChangedOption(changeEvent: SelectChangeEvent) {
    changeEvent.value.function();
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

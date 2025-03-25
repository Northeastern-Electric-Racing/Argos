import { Component, input } from '@angular/core';
import { SelectChangeEvent } from 'primeng/select';

export interface DropdownOption {
  name: string;
  function: () => void;
}

@Component({
  selector: 'select-dropdown',
  templateUrl: './select-dropdown.component.html',
  styleUrl: './select-dropdown.component.css'
})
export class SelectDropdownComponent {
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

  selectedOption: DropdownOption | undefined;

  handleChangedOption(changeEvent: SelectChangeEvent) {
    changeEvent.value.function();
  }
}

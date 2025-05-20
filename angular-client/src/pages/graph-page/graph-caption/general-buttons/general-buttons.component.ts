import { Component, input } from '@angular/core';
import { SelectorConfig } from 'src/components/select-dropdown/select-dropdown.component';
import { Run } from 'src/utils/types.utils';


import { RunSelectorComponent } from '../run-selector/run-selector.component';
import { ButtonComponent } from '../../../../components/argos-button/argos-button.component';
import { SelectDropdownComponent } from '../../../../components/select-dropdown/select-dropdown.component';
import HStackComponent from 'src/components/hstack/hstack.component';

@Component({
    selector: 'general-buttons',
    templateUrl: './general-buttons.component.html',
    styleUrl: './general-buttons.component.css',
    standalone: true,
    imports: [ RunSelectorComponent, ButtonComponent, SelectDropdownComponent, HStackComponent]
})
export class GeneralButtonsComponent {
  historicalOn = input<boolean>(false);
  onRunSelected = input.required<(run: Run) => void>();
  onClearDataType = input.required<() => void>();
  onSetRealTime = input.required<() => void>();
  selectorConfig = input.required<SelectorConfig>();
}

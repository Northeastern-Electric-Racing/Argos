import { Component, input } from '@angular/core';
import { SelectorConfig } from 'src/components/select-dropdown/select-dropdown.component';
import { Run } from 'src/utils/types.utils';

@Component({
  selector: 'general-buttons',
  templateUrl: './general-buttons.component.html',
  styleUrl: './general-buttons.component.css'
})
export class GeneralButtonsComponent {
  historicalOn = input<boolean>(false);
  onRunSelected = input.required<(run: Run) => void>();
  onClearDataType = input.required<() => void>();
  onSetRealTime = input.required<() => void>();
  selectorConfig = input.required<SelectorConfig>();
}

import { Component, input } from '@angular/core';
import { Run } from 'src/utils/types.utils';

@Component({
  selector: 'general-buttons',
  templateUrl: './general-buttons.component.html',
  styleUrl: './general-buttons.component.css'
})
export class GeneralButtonsComponent {
  run = input<Run>();
  onRunSelected = input.required<(run: Run) => void>();
  onClearDataType = input.required<() => void>();
  onSetRealTime = input.required<() => void>();
}

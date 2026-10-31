import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';

@Component({
  selector: 'fault-buttons',
  templateUrl: './fault-buttons.component.html',
  styleUrl: './fault-buttons.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TuiButton]
})
export class FaultButtonsComponent {
  onClearData = input.required<() => void>();
}

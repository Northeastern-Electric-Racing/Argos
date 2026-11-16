import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { ButtonComponent } from '../../../../components/argos-button/argos-button.component';

@Component({
  selector: 'fault-buttons',
  templateUrl: './fault-buttons.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [ButtonComponent]
})
export class FaultButtonsComponent {
  onClearData = input.required<() => void>();
}

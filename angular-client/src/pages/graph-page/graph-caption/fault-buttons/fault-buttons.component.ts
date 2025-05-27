import { Component, input } from '@angular/core';
import { ButtonComponent } from '../../../../components/argos-button/argos-button.component';

@Component({
  selector: 'fault-buttons',
  templateUrl: './fault-buttons.component.html',
  styleUrl: './fault-buttons.component.css',
  standalone: true,
  imports: [ButtonComponent]
})
export class FaultButtonsComponent {
  onClearData = input.required<() => void>();
}

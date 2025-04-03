import { Component, input } from '@angular/core';

@Component({
  selector: 'fault-buttons',
  templateUrl: './fault-buttons.component.html',
  styleUrl: './fault-buttons.component.css'
})
export class FaultButtonsComponent {
  onClearData = input.required<() => void>();
}

import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'fault-buttons',
  templateUrl: './fault-buttons.component.html',
  styleUrl: './fault-buttons.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [MatButton]
})
export class FaultButtonsComponent {
  onClearData = input.required<() => void>();
}

import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { Button } from 'primeng/button';

@Component({
  selector: 'fault-buttons',
  templateUrl: './fault-buttons.component.html',
  styleUrl: './fault-buttons.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [Button]
})
export class FaultButtonsComponent {
  onClearData = input.required<() => void>();
}

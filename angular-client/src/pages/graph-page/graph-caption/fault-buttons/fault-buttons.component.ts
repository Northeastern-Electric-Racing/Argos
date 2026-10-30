import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

@Component({
  selector: 'fault-buttons',
  templateUrl: './fault-buttons.component.html',
  styleUrl: './fault-buttons.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [NzButtonModule]
})
export class FaultButtonsComponent {
  onClearData = input.required<() => void>();
}

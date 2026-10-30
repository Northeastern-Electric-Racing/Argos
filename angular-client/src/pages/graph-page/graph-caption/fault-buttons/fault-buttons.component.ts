import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEraser } from '@ng-icons/lucide';
import { HlmButton } from '@spartan-ng/helm/button';

@Component({
  selector: 'fault-buttons',
  templateUrl: './fault-buttons.component.html',
  styleUrl: './fault-buttons.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [HlmButton, NgIcon],
  providers: [provideIcons({ lucideEraser })]
})
export class FaultButtonsComponent {
  onClearData = input.required<() => void>();
}

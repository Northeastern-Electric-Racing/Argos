import { Component, computed, input, linkedSignal, output } from '@angular/core';
import TypographyComponent from '../typography/typography.component';

@Component({
  selector: 'switch',
  templateUrl: './switch.component.html',
  styleUrls: ['./switch.component.css'],
  standalone: true,
  imports: [TypographyComponent]
})
export class SwitchComponent {
  isOn = input<boolean>(false);
  offString = input<string>('PAUSED');
  onString = input<string>('ALLOWED');
  // Follows the isOn input but can be toggled locally.
  currentState = linkedSignal(() => this.isOn());
  chargingString = computed(() => (this.currentState() ? this.onString() : this.offString()));
  toggleEmitter = output<boolean>();

  onToggle() {
    this.currentState.update((v) => !v);
    this.toggleEmitter.emit(this.currentState());
  }
}

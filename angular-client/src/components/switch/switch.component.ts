import { Component, OnInit, computed, input, output, signal } from '@angular/core';
import TypographyComponent from '../typography/typography.component';

@Component({
  selector: 'switch',
  templateUrl: './switch.component.html',
  styleUrls: ['./switch.component.css'],
  standalone: true,
  imports: [TypographyComponent]
})
export class SwitchComponent implements OnInit {
  isOn = input<boolean>(false);
  offString = input<string>('PAUSED');
  onString = input<string>('ALLOWED');
  currentState = signal(false);
  chargingString = computed(() => (this.currentState() ? this.onString() : this.offString()));
  toggleEmitter = output<boolean>();

  ngOnInit(): void {
    this.currentState.set(this.isOn());
  }

  onToggle() {
    this.currentState.update((v) => !v);
    this.toggleEmitter.emit(this.currentState());
  }
}

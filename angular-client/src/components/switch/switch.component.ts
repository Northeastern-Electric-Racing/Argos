import { Component, OnInit, input, output, signal } from '@angular/core';
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
  chargingString = signal('');
  toggleEmitter = output<boolean>();

  ngOnInit(): void {
    this.currentState.set(this.isOn());
    this.chargingString.set(this.currentState() ? this.onString() : this.offString());
  }

  onToggle() {
    this.currentState.update((v) => !v);
    this.chargingString.set(this.currentState() ? this.onString() : this.offString());
    this.toggleEmitter.emit(this.currentState());
  }
}

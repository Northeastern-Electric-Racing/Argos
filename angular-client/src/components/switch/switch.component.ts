import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import TypographyComponent from '../typography/typography.component';

@Component({
  selector: 'switch',
  templateUrl: './switch.component.html',
  styleUrls: ['./switch.component.css'],
  standalone: true,
  imports: [TypographyComponent]
})
export class SwitchComponent implements OnInit {
  @Input() isOn: boolean = false;
  @Input() offString: string = 'PAUSED';
  @Input() onString: string = 'ALLOWED';
  chargingString: string = this.offString;
  @Output() toggleEmitter = new EventEmitter<boolean>();

  ngOnInit(): void {
    // Set the initial value of chargingString based on isOn
    this.chargingString = this.isOn ? this.onString : this.offString;
  }

  onToggle() {
    this.isOn = !this.isOn;
    if (this.isOn) {
      this.chargingString = this.onString;
    } else {
      this.chargingString = this.offString;
    }
    this.toggleEmitter.emit(this.isOn); // Emit the new state
  }
}

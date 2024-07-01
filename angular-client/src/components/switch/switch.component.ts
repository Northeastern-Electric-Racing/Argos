import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'switch',
  templateUrl: './switch.component.html',
  styleUrls: ['./switch.component.css']
})
export class SwitchComponent {
  @Input() isOn: boolean = false;
  @Input() offString: string = 'DISABLED';
  @Input() onString: string = 'ENABLED';
  chargingString: string = this.offString;
  @Output() toggle = new EventEmitter<boolean>();

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
    this.toggle.emit(this.isOn); // Emit the new state
  }
}

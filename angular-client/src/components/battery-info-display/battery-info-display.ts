import { Component, Input } from '@angular/core';

@Component({
  selector: 'battery-info-display',
  templateUrl: './battery-info-display.html',
  styleUrls: ['./battery-info-display.css']
})
export class BatteryInfoDisplay {
  @Input() voltageValue: number = 0;
}

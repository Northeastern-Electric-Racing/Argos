import { Component, Input } from '@angular/core';

@Component({
  selector: 'battery-info-desktop',
  templateUrl: './battery-info-desktop.component.html',
  styleUrls: ['./battery-info-desktop.component.css']
})
export default class BatteryInfoDesktop {
  @Input() voltage: number = 0;
  @Input() packTemp: number = 0;
  @Input() stateOfCharge: number = 0;
  @Input() chargeCurrentLimit: number = 0;
  @Input() dischargeCurrentLimit: number = 0;

}

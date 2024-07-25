import { Component, Input } from '@angular/core';

@Component({
  selector: 'battery-info-mobile',
  templateUrl: './battery-info-mobile.component.html',
  styleUrls: ['./battery-info-mobile.component.css']
})
export default class BatteryInfoMobile {
  @Input() voltage: number = 0;
  @Input() packTemp: number = 0;
  @Input() stateOfCharge: number = 0;
  @Input() chargeCurrentLimit: number = 0;
  @Input() dischargeCurrentLimit: number = 0;
}

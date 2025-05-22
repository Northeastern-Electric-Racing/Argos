import { Component, Input } from '@angular/core';

import { BatteryPercentageComponent } from '../../../../../components/battery-percentage/battery-percentage.component';
import { DividerComponent } from '../../../../../components/divider/divider';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import VStackComponent from 'src/components/vstack/vstack.component';
import ThermometerComponent from 'src/components/thermometer/thermometer.component';

@Component({
  selector: 'battery-info-mobile',
  templateUrl: './battery-info-mobile.component.html',
  styleUrls: ['./battery-info-mobile.component.css'],
  standalone: true,
  imports: [
    BatteryPercentageComponent,
    DividerComponent,
    TypographyComponent,
    HStackComponent,
    VStackComponent,
    ThermometerComponent
  ]
})
export default class BatteryInfoMobileComponent {
  @Input() voltage: number = 0;
  @Input() packTemp: number = 0;
  @Input() stateOfCharge: number = 0;
  @Input() chargeCurrentLimit: number = 0;
  @Input() dischargeCurrentLimit: number = 0;
}

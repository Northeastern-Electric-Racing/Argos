import { Component, input } from '@angular/core';

import { BatteryPercentageComponent } from '../../../../../components/battery-percentage/battery-percentage.component';
import { DividerComponent } from '../../../../../components/divider/divider';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import VStackComponent from 'src/components/vstack/vstack.component';
import ThermometerComponent from 'src/components/thermometer/thermometer.component';

@Component({
  selector: 'battery-info-desktop',
  templateUrl: './battery-info-desktop.component.html',
  styleUrls: ['./battery-info-desktop.component.css'],
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
export default class BatteryInfoDesktopComponent {
  voltage = input<number>(0);
  packTemp = input<number>(0);
  stateOfCharge = input<number>(0);
  chargeCurrentLimit = input<number>(0);
  dischargeCurrentLimit = input<number>(0);
}

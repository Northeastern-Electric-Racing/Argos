import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CircularPercentageComponent } from '../../circular-percentage/circular-percentage.component';
import { DividerComponent } from '../../divider/divider';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import VStackComponent from 'src/components/vstack/vstack.component';
import ThermometerComponent from 'src/components/thermometer/thermometer.component';
import { wifi } from '../wifi.classes';

@Component({
  selector: 'raspberry-pi-mobile',
  templateUrl: './raspberry-pi-mobile.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [
    CircularPercentageComponent,
    DividerComponent,
    UiIconComponent,
    TypographyComponent,
    HStackComponent,
    VStackComponent,
    ThermometerComponent
  ]
})
export default class RaspberryPiMobileComponent {
  cpuUsage = input<number>(0);
  cpuTemp = input<number>(0);
  ramUsage = input<number>(0);
  wifiRSSI = input<number>(0);
  mcs = input<number>(0);

  protected readonly wifi = wifi;
  colorRed = '#FF0000';
  colorPurple = '#800080';
}

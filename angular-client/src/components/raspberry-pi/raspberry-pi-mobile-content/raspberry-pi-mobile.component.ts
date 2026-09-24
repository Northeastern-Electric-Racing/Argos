import { Component, input } from '@angular/core';
import { CircularPercentageComponent } from '../../circular-percentage/circular-percentage.component';
import { DividerComponent } from '../../divider/divider';
import { MatIcon } from '@angular/material/icon';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import VStackComponent from 'src/components/vstack/vstack.component';
import ThermometerComponent from 'src/components/thermometer/thermometer.component';

@Component({
  selector: 'raspberry-pi-mobile',
  templateUrl: './raspberry-pi-mobile.component.html',
  styleUrls: ['./raspberry-pi-mobile.component.css'],
  standalone: true,
  imports: [
    CircularPercentageComponent,
    DividerComponent,
    MatIcon,
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

  colorRed = '#FF0000';
  colorPurple = '#800080';
}

import { Component, Input } from '@angular/core';
import { CircularPercentageComponent } from '../../circular-percentage/circular-percentage.component';
import { DividerComponent } from '../../divider/divider';
import { MatIcon } from '@angular/material/icon';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import VStackComponent from 'src/components/vstack/vstack.component';
import ThermometerComponent from 'src/components/thermometer/thermometer.component';

@Component({
  selector: 'raspberry-pi-desktop',
  templateUrl: './raspberry-pi-desktop.component.html',
  styleUrls: ['./raspberry-pi-desktop.component.css'],
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
export default class RaspberryPiDesktopComponent {
  @Input() cpuUsage: number = 0;
  @Input() cpuTemp: number = 0;
  @Input() ramUsage: number = 0;
  @Input() wifiRSSI: number = 0;
  @Input() mcs: number = 0;

  colorRed = '#FF0000';
  colorPurple = '#800080';
}

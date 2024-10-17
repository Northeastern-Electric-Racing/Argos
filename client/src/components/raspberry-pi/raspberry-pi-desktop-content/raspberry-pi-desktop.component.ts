import { Component, Input } from '@angular/core';

@Component({
  selector: 'raspberry-pi-desktop',
  templateUrl: './raspberry-pi-desktop.component.html',
  styleUrls: ['./raspberry-pi-desktop.component.css']
})
export default class RaspberryPiDesktop {
  @Input() cpuUsage: number = 0;
  @Input() cpuTemp: number = 0;
  @Input() ramUsage: number = 0;
  @Input() wifiRSSI: number = 0;
  @Input() mcs: number = 0;

  colorRed = '#FF0000';
  colorPurple = '#800080';
}

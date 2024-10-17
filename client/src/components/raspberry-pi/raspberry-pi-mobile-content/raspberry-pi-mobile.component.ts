import { Component, Input } from '@angular/core';

@Component({
  selector: 'raspberry-pi-mobile',
  templateUrl: './raspberry-pi-mobile.component.html',
  styleUrls: ['./raspberry-pi-mobile.component.css']
})
export default class RaspberryPiMobile {
  @Input() cpuUsage: number = 0;
  @Input() cpuTemp: number = 0;
  @Input() ramUsage: number = 0;
  @Input() wifiRSSI: number = 0;
  @Input() mcs: number = 0;

  colorRed = '#FF0000';
  colorPurple = '#800080';
}

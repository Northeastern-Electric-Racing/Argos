import { Component, HostListener } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'raspberry-pi',
  templateUrl: './raspberry-pi.component.html',
  styleUrls: ['./raspberry-pi.component.css']
})
export default class RasberryPi {
  cpuUsage: number = 0;
  cpuTemp: number = 0;
  ramUsage: number = 0;
  wifiRSSI: number = 0;
  mcs: number = 0;

  mobileThreshold = 650;
  isMobile = window.innerWidth < this.mobileThreshold;

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.CPUUsage).subscribe((value) => {
      this.cpuUsage = floatPipe(value.values[0]);
    });
    this.storage.get(IdentifierDataType.CPUTemp).subscribe((value) => {
      this.cpuTemp = floatPipe(value.values[0]);
    });
    this.storage.get(IdentifierDataType.RAMUsage).subscribe((value) => {
      this.ramUsage = Math.round((1 - floatPipe(value.values[0]) / 8000) * 100);
    });
    this.storage.get(IdentifierDataType.WIFIRSSI).subscribe((value) => {
      this.wifiRSSI = floatPipe(value.values[0]);
    });
    this.storage.get(IdentifierDataType.MCS).subscribe((value) => {
      this.mcs = floatPipe(value.values[0]);
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}

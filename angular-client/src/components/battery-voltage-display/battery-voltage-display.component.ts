import { Component, HostListener } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'battery-voltage-display',
  templateUrl: './battery-voltage-display.component.html',
  styleUrls: ['./battery-voltage-display.component.css']
})
export default class BatteryVoltageDisplay {
  avgVoltage: number = 0;
  minVolts: number = 0;
  maxVolts: number = 0;
  mobileThreshold = 1000;
  isDesktop = window.innerWidth > this.mobileThreshold;

  constructor(private storage: Storage) {}

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isDesktop = window.innerWidth >= this.mobileThreshold;
  }

  ngOnInit() {
    this.storage.get(IdentifierDataType.VOLTAGE).subscribe((value) => {
      this.avgVoltage = floatPipe(value.values[0]);
      if (this.avgVoltage < this.minVolts) {
        this.minVolts = this.avgVoltage;
      } else if (this.avgVoltage > this.maxVolts) {
        this.maxVolts = this.avgVoltage;
      }
    });
  }
}

import { Component, HostListener } from '@angular/core';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';
import Storage from 'src/services/storage.service';

@Component({
  selector: 'battery-info-display',
  templateUrl: './battery-info-display.html',
  styleUrls: ['./battery-info-display.css']
})
export class BatteryInfoDisplay {
  voltage: number = 0;
  packTemp: number = 0;
  stateOfCharge: number = 0;
  chargeCurrentLimit: number = 0;
  dischargeCurrentLimit: number = 0;
  mobileThreshold = 768;
  isMobile = window.innerWidth < this.mobileThreshold;

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.PACK_TEMP).subscribe((value) => {
      this.packTemp = floatPipe(value.values[0]);
    });
    this.storage.get(IdentifierDataType.PACK_VOLTAGE).subscribe((value) => {
      this.voltage = floatPipe(value.values[0]);
    });
    this.storage.get(IdentifierDataType.STATE_OF_CHARGE).subscribe((value) => {
      this.stateOfCharge = floatPipe(value.values[0]);
    });
    this.storage.get(IdentifierDataType.CHARGE_CURRENT_LIMIT).subscribe((value) => {
      this.chargeCurrentLimit = floatPipe(value.values[0]);
    });
    this.storage.get(IdentifierDataType.DISCHARGE_CURRENT_LIMIT).subscribe((value) => {
      this.dischargeCurrentLimit = floatPipe(value.values[0]);
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}

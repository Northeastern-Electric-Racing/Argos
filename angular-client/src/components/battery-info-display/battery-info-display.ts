import { Component } from '@angular/core';
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

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.PACK_TEMP).subscribe((value) => {
      this.packTemp = floatPipe(value.values[0]);
    });
    this.storage.get(IdentifierDataType.VOLTAGE).subscribe((value) => {
      this.voltage = floatPipe(value.values[0]);
    });
    this.storage.get(IdentifierDataType.STATE_OF_CHARGE).subscribe((value) => {
      this.stateOfCharge = floatPipe(value.values[0]);
    });
  }
}

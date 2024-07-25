import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

enum BMSMODE {
  DEFAULT = 0,
  READY = 1,
  CHARGING = 2,
  FAULTED = 3
}

@Component({
  selector: 'BMS-mode-display',
  templateUrl: './BMS-mode-display.component.html',
  styleUrls: ['./BMS-mode-display.component.css']
})
export default class BMSModeDisplay {
  bmsMode: BMSMODE = 1;

  // Mapping object for colors
  private colorMap: { [key in BMSMODE]: string } = {
    [BMSMODE.DEFAULT]: 'grey',
    [BMSMODE.READY]: 'blue',
    [BMSMODE.CHARGING]: 'green',
    [BMSMODE.FAULTED]: 'red'
  };
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.BMS_MODE).subscribe((value) => {
      this.bmsMode = floatPipe(value.values[0]) as BMSMODE;
    });
  }

  getBMSModeString(): string {
    return BMSMODE[this.bmsMode];
  }

  getStatusColor(): string {
    return this.colorMap[this.bmsMode];
  }
}

import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

@Component({
  selector: 'fault-display',
  templateUrl: './fault-display.component.html',
  styleUrls: ['./fault-display.component.css']
})
export default class FaultDisplay {
  faultStrings: string[] = [];
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.COMM_TIMEOUT_FAULT).subscribe((value) => {
      if (value.values[0]) {
        this.faultStrings.push('Communication Timeout');
      }
    });

    this.storage.get(IdentifierDataType.HARDWARE_FAILURE_FAULT).subscribe((value) => {
      if (value.values[0]) {
        this.faultStrings.push('Hardware Failure');
      }
    });

    this.storage.get(IdentifierDataType.OVER_TEMP_FAULT).subscribe((value) => {
      if (value.values[0]) {
        this.faultStrings.push('Over Temp');
      }
    });

    this.storage.get(IdentifierDataType.VOLTAGE_WRONG_FAULT).subscribe((value) => {
      if (value.values[0]) {
        this.faultStrings.push('Voltage Wrong');
      }
    });

    this.storage.get(IdentifierDataType.WRONG_BAT_CONNECT_FAULT).subscribe((value) => {
      if (value.values[0]) {
        this.faultStrings.push('Wrong Battery Connect');
      }
    });
  }

  getFaultStrings() {
    if (this.faultStrings.length === 0) {
      return ['No faults to display'];
    }

    const faults = [...this.faultStrings];

    return faults.slice(0, 10).map((fault, index) => `${index + 1}. ${fault}`);
  }
}

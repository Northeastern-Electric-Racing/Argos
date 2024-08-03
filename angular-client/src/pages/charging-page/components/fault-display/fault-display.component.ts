import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

@Component({
  selector: 'fault-display',
  templateUrl: './fault-display.component.html',
  styleUrls: ['./fault-display.component.css']
})
export default class FaultDisplay {
  faults: { faultName: string; time: string }[] = [];
  resetButton = {
    onClick: () => {
      this.faults.shift();
    },
    icon: 'restart_alt'
  };
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.COMM_TIMEOUT_FAULT).subscribe((value) => {
      this.faultPushCheck(value.values[0], 'Comm Timeout');
    });

    this.storage.get(IdentifierDataType.HARDWARE_FAILURE_FAULT).subscribe((value) => {
      this.faultPushCheck(value.values[0], 'Hardware Failure');
    });

    this.storage.get(IdentifierDataType.OVER_TEMP_FAULT).subscribe((value) => {
      this.faultPushCheck(value.values[0], 'Over Temp');
    });

    this.storage.get(IdentifierDataType.VOLTAGE_WRONG_FAULT).subscribe((value) => {
      this.faultPushCheck(value.values[0], 'Voltage Wrong');
    });

    this.storage.get(IdentifierDataType.WRONG_BAT_CONNECT_FAULT).subscribe((value) => {
      this.faultPushCheck(value.values[0], 'Wrong Battery Connect');
    });
  }

  //
  /**
   * Takes in a string (which should have an integer value) representing the storage value of the fault, and the faults name.
   * If the string is 0 their is no fault, anything else means there was a fault, and the fault is pushed to the faults array,
   * with the given name and the current time.
   * @param faultValue an string with an integer value, 0 means no fault, anything else means there was a fault.
   * @param faultName the name of the fault, to be displayed.
   */
  faultPushCheck(faultValue: string, faultName: string) {
    if (parseInt(faultValue) !== 0) {
      this.faults.push({ faultName, time: new Date().toLocaleTimeString() });
    }
  }
}

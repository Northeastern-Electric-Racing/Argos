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
      this.faults = [];
    },
    icon: 'restart_alt'
  };
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.COMM_TIMEOUT_FAULT).subscribe((value) => {
      this.addFault(value.values[0], 'Comm Timeout');
    });

    this.storage.get(IdentifierDataType.HARDWARE_FAILURE_FAULT).subscribe((value) => {
      this.addFault(value.values[0], 'Hardware Failure');
    });

    this.storage.get(IdentifierDataType.OVER_TEMP_FAULT).subscribe((value) => {
      this.addFault(value.values[0], 'Over Temp');
    });

    this.storage.get(IdentifierDataType.VOLTAGE_WRONG_FAULT).subscribe((value) => {
      this.addFault(value.values[0], 'Voltage Wrong');
    });

    this.storage.get(IdentifierDataType.WRONG_BAT_CONNECT_FAULT).subscribe((value) => {
      this.addFault(value.values[0], 'Wrong Battery Connect');
    });
  }

  //
  /**
   * Adds the fault name, with the current time to the faults array, if the faultValue is NOT 0.
   * Shifts through the fault array to keep only the most recent 50 faults.
   *
   * @param faultValue an string with an integer value.
   * @param faultName the name of the fault, to be displayed.
   */
  addFault(faultValue: string, faultName: string) {
    if (parseInt(faultValue) !== 0) {
      if (this.faults.length >= 50) {
        this.faults.shift();
      }
      this.faults.push({ faultName, time: new Date().toLocaleTimeString() });
    }
  }
}

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

  // Takes in a string (which should be an integer) representing the storage value of a fault, and the faults name.
  // If the string is 0 their is no fault, anything else means there was a fault.
  // (this is check is required because the storage service still takes information from the server even if a fault hasn't happened, requiring
  // us to ensure that change to the storage value was actually a fault)
  faultPushCheck(addFault: string, faultName: string) {
    if (parseInt(addFault) !== 0) {
      this.faults.push({ faultName, time: new Date().toLocaleTimeString() });
    }
  }
}

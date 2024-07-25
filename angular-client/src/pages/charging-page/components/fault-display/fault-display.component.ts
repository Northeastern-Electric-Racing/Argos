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
      if (value.values[0]) {
        this.faults.push({ faultName: 'Communication Timeout', time: new Date().toLocaleTimeString() });
      }
    });

    this.storage.get(IdentifierDataType.HARDWARE_FAILURE_FAULT).subscribe((value) => {
      if (value.values[0]) {
        this.faults.push({ faultName: 'Hardware Failure', time: new Date().toLocaleTimeString() });
      }
    });

    this.storage.get(IdentifierDataType.OVER_TEMP_FAULT).subscribe((value) => {
      if (value.values[0]) {
        this.faults.push({ faultName: 'Over Temp', time: new Date().toLocaleTimeString() });
      }
    });

    this.storage.get(IdentifierDataType.VOLTAGE_WRONG_FAULT).subscribe((value) => {
      if (value.values[0]) {
        this.faults.push({ faultName: 'Voltage Wrong', time: new Date().toLocaleTimeString() });
      }
    });

    this.storage.get(IdentifierDataType.WRONG_BAT_CONNECT_FAULT).subscribe((value) => {
      if (value.values[0]) {
        this.faults.push({ faultName: 'Wrong Battery Connect', time: new Date().toLocaleTimeString() });
      }
    });
  }
}

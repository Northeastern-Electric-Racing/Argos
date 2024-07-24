import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'BMS-mode-display',
  templateUrl: './BMS-mode-display.component.html',
  styleUrls: ['./BMS-mode-display.component.css']
})
export default class BMSModeDisplay {
  bmsValue: number = 0; // can be either charging=2, ready=1, faulted=3
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.BMS_MODE).subscribe((value) => {
      this.bmsValue = floatPipe(value.values[0]);
    });
  }

  getState(bmsValue: number) {
    switch (bmsValue) {
      case 0:
        return 'Default Argos State';
      case 1:
        return 'Ready';
      case 2:
        return 'Charging';
      case 3:
        return 'Faulted';
      default:
        throw new Error('Invalid BMS value'); // !!!!FOR REVIEW!!!! : is this how I throw error
    }
  }

  getStatusColor(bmsValue: number) {
    switch (bmsValue) {
      case 0:
        return 'grey';
      case 1:
        return 'blue';
      case 2:
        return 'green';
      case 3:
        return 'red';
      default:
        throw new Error('Invalid BMS value'); // !!!!FOR REVIEW!!!! : is this how I throw error
    }
  }
}

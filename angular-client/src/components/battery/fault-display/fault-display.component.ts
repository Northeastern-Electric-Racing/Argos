import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

@Component({
  selector: 'fault-display',
  templateUrl: './fault-display.component.html',
  styleUrls: ['./fault-display.component.css']
})
export default class FaultDisplay {
  faultStrings: string[] = ['No faults to display'];
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.FAULT).subscribe((value) => {
      if (this.faultStrings[0] === 'No faults to display') {
        this.faultStrings = [];
      }
      this.faultStrings.push(this.getFaultString(value.values[0]));
    });
  }

  getFaultString(faultCode: string) {
    // TODO: probably cleaner way to do this (... maybe with an enum & map)
    switch (faultCode) {
      case '0x1':
        return 'Cells not balancing';
      case '0x2':
        return 'Cell voltage too low';
      case '0x4':
        return 'Cell voltage too high';
      case '0x8':
        return 'Pack too hot';
      case '0x10':
        return 'Open wiring fault';
      case '0x20':
        return 'Internal software fault';
      case '0x40':
        return 'Internal thermal error';
      case '0x80':
        return 'Internal cell communication fault';
      case '0x100':
        return 'Current sensor fault';
      case '0x200':
        return 'Charge reading mismatch';
      case '0x400':
        return 'Low cell voltage';
      case '0x800':
        return 'Weak pack fault';
      case '0x1000':
        return 'External CAN fault';
      case '0x2000':
        return 'Discharge limit enforcement fault';
      default:
        return 'Unknown fault';
    }
  }
}

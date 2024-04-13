import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

@Component({
  selector: 'torque-display',
  templateUrl: './torque-display.component.html',
  styleUrls: ['./torque-display.component.css']
})
export default class TorqueDisplay {
  torque: number = 0;

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.TORQUE).subscribe((value) => {
      this.torque = parseInt(value.values[0]);
    });
  }
}

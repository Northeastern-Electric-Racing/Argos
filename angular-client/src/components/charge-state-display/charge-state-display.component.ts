import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'charge-state-display',
  templateUrl: './charge-state-display.component.html',
  styleUrls: ['./charge-state-display.component.css']
})
export default class ChargeStateDisplay {
  stateOfCharge: number = 0;
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.STATE_OF_CHARGE).subscribe((value) => {
      this.stateOfCharge = floatPipe(value.values[0]);
    });
  }
}

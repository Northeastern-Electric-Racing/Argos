import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'state-of-charge-display',
  templateUrl: './state-of-charge-display.component.html',
  styleUrls: ['./state-of-charge-display.component.css']
})
export default class StateOfChargeDisplay {
  stateOfCharge: number = 0;
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.STATE_OF_CHARGE).subscribe((value) => {
      this.stateOfCharge = floatPipe(value.values[0]);
    });
  }
}

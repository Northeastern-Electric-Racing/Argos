import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

@Component({
  selector: 'brake-pressure-display',
  templateUrl: './brake-pressure-display.component.html',
  styleUrls: ['./brake-pressure-display.component.css']
})
export default class BrakePressureDisplay {
  brakePressure: number = 0;
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.BRAKE_PRESSURE).subscribe((value) => {
      this.brakePressure = parseInt(value.values[0]);
    });
  }
}

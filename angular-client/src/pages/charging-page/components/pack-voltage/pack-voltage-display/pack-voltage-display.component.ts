import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'pack-voltage-display',
  templateUrl: './pack-voltage-display.component.html',
  styleUrls: ['./pack-voltage-display.component.css']
})
export default class PackVoltageDisplay {
  voltage: number = 0;

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.PACK_VOLTAGE).subscribe((value) => {
      this.voltage = floatPipe(value.values[0]);
    });
  }
}

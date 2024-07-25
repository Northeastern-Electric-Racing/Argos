import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'pack-temp',
  templateUrl: './pack-temp.component.html',
  styleUrls: ['./pack-temp.component.css']
})
export default class PackTemp {
  packTemp: number = 0;
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.PACK_TEMP).subscribe((value) => {
      this.packTemp = floatPipe(value.values[0]);
    });
  }
}

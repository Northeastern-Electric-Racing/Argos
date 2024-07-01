import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'current-display',
  templateUrl: './current-display.component.html',
  styleUrls: ['./current-display.component.css']
})
export default class CurrentDisplay {
  amps: number = 0;
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.AMPS).subscribe((value) => {
      this.amps = floatPipe(value.values[0]);
    });
  }
}

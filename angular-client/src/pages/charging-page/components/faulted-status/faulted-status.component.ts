import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import Theme from 'src/services/theme.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'faulted-status',
  templateUrl: './faulted-status.component.html',
  styleUrls: ['./faulted-status.component.css']
})
export default class FaultedStatus {
  isFaulted: boolean = false;
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.BMS_MODE).subscribe((value) => {
      this.isFaulted = floatPipe(value.values[0]) === 3;
    });
  }

  getStatusColor(isFaulted: boolean) {
    return isFaulted ? 'red' : Theme.infoBackground;
  }
}

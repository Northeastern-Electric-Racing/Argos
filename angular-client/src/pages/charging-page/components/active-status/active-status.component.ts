import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import Theme from 'src/services/theme.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { floatPipe } from 'src/utils/pipes.utils';

@Component({
  selector: 'active-status',
  templateUrl: './active-status.component.html',
  styleUrls: ['./active-status.component.css']
})
export default class ActiveStatus {
  isActive: boolean = false;
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.BMS_MODE).subscribe((value) => {
      this.isActive = floatPipe(value.values[0]) === 2;
    });
  }

  getStatusColor(isActive: boolean) {
    return isActive ? 'green' : Theme.infoBackground;
  }
}

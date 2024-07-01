import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

@Component({
  selector: 'fault-display',
  templateUrl: './fault-display.component.html',
  styleUrls: ['./fault-display.component.css']
})
export default class FaultDisplay {
  faultString: string[] = ['No faults to display'];
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.AMPS).subscribe((value) => {
      this.faultString = ['Fault happend']; // TODO: add a function to convert values.value[0] to text
    });
  }
}

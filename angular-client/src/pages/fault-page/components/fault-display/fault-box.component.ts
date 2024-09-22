import { Component } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

@Component({
  selector: 'fault-box',
  templateUrl: './fault-box.component.html',
  styleUrls: ['./fault-box.component.css']
})
export default class FaultBox {
  constructor(private storage: Storage) {}

  ngOnInit() {}
}

import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

/**
 * Container for the handling page, obtains data from the storage service.
 */
@Component({
  selector: 'handling-page',
  styleUrls: ['./handling-page.component.css'],
  templateUrl: './handling-page.component.html'
})
export default class HandlingPage implements OnInit {
  time = new Date();
  location: string = 'No Location Set';
  constructor(private storage: Storage) {}

  ngOnInit() {
    setInterval(() => {
      this.time = new Date();
    }, 1000);

    this.storage.get(IdentifierDataType.LOCATION).subscribe((value) => {
      [this.location] = value.values || ['No Location Set'];
    });
  }
}

import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

@Component({
  selector: 'viewer-display',
  templateUrl: './viewer-display.component.html',
  styleUrls: ['./viewer-display.component.css']
})
export default class ViewerDisplay implements OnInit {
  numViewers: number = 0;
  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.VIEWERS).subscribe((value) => {
      this.numViewers = parseInt(value.values[0]);
    });
  }
}

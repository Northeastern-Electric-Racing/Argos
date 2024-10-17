import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';

@Component({
  selector: 'speed-display',
  templateUrl: './speed-display.component.html',
  styleUrls: ['./speed-display.component.css']
})
export default class SpeedDisplay implements OnInit {
  speed: number = 0;

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.SPEED).subscribe((value) => {
      this.speed = parseInt(value.values[0]);
    });
  }
}

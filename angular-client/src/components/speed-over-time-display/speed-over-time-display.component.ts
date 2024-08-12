import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'speed-over-time-display',
  templateUrl: './speed-over-time-display.component.html',
  styleUrls: ['./speed-over-time-display.component.css']
})
export default class SpeedOverTimeDisplay implements OnInit {
  data: GraphData[] = [];

  constructor(private storage: Storage) {}
  ngOnInit() {
    this.storage.get(IdentifierDataType.SPEED).subscribe((value) => {
      this.data.push({ x: new Date().getTime(), y: parseInt(value.values[0]) });
    });
  }
}

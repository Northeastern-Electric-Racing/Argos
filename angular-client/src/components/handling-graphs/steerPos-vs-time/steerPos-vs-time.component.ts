import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'steerPos-vs-time',
  templateUrl: './steerPos-vs-time.component.html',
  styleUrls: ['./steerPos-vs-time.component.css']
})
export default class SteerPosVsTime implements OnInit {
  data: GraphData[] = [];
  maxDataPoints = 100;

  constructor(private storage: Storage) {}
  ngOnInit() {
    this.storage.get(IdentifierDataType.STEERING_ANGLE).subscribe((value) => {
      this.data.push({ x: Number(value.time), y: parseInt(value.values[0]) });
      if (this.data.length > 100) {
        this.data.shift();
      }
    });
  }
}

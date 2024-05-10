import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'ride-height-time',
  templateUrl: './ride-height-time.component.html',
  styleUrls: ['./ride-height-time.component.css']
})
export default class RideHeightTime implements OnInit {
  data: GraphData[] = [];
  maxDataPoints = 100;

  constructor(private storage: Storage) {}
  ngOnInit() {
    this.storage.get(IdentifierDataType.RIDEHEIGHT).subscribe((value) => {
      this.data.push({ x: Number(value.time), y: parseInt(value.values[0]) });
      if (this.data.length > 100) {
        this.data.shift();
      }
    });
  }
}

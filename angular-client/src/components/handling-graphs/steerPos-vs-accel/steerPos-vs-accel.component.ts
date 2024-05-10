import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { decimalPipe } from 'src/utils/pipes.utils';
import { GraphData } from 'src/utils/types.utils';

/**
 * Component that graphs steering position vs lateral acceleration
 */

@Component({
  selector: 'steerPos-vs-accel',
  templateUrl: './steerPos-vs-accel.component.html',
  styleUrls: ['./steerPos-vs-accel.component.css']
})
export class SteerPosVsAccel implements OnInit {
  data: GraphData[] = [];

  long: number = 0;
  steer: number = 0;

  maxDataPoints = 200;

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.XYZAccel).subscribe((value) => {
      this.long = decimalPipe(value.values[1]);
      this.storage.get(IdentifierDataType.STEERING_ANGLE).subscribe((value) => {
        this.steer = parseInt(value.values[0]);
      });
      this.data.push({
        x: this.long,
        y: this.steer
      });

      //limits the data storage to 200 to prevent lag
      if (this.data.length > this.maxDataPoints) {
        this.data = this.data.slice(1);
      }
    });
  }
}

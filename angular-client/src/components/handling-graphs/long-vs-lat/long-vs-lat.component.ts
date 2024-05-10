import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { decimalPipe } from 'src/utils/pipes.utils';
import { GraphData } from 'src/utils/types.utils';

/**
 * Component that graphs lat acceleration vs long acceleration
 */

@Component({
  selector: 'long-vs-lat',
  templateUrl: './long-vs-lat.component.html',
  styleUrls: ['./long-vs-lat.component.css']
})
export class LongVsLat implements OnInit {
  data: GraphData[] = [];

  xMax: number = 0;
  yMax: number = 0;

  maxDataPoints = 50;

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.XYZAccel).subscribe((value) => {
      const x1 = decimalPipe(value.values[0]);
      const y1 = decimalPipe(value.values[1]);
      this.data.push({
        x: x1,
        y: y1
      });

      //limits the data storage to 400 to prevent lag
      if (this.data.length > this.maxDataPoints) {
        this.data = this.data.slice(1);
      }

      //checks if there is a new max
      this.xMax = Math.max(Math.abs(x1), this.xMax);
      this.yMax = Math.max(Math.abs(y1), this.yMax);
    });
  }
}

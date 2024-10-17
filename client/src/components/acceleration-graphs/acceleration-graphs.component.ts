import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { decimalPipe } from 'src/utils/pipes.utils';
import { GraphData } from 'src/utils/types.utils';

/**
 * Component that displays acceleration data from the storage service
 * onto graphs
 *
 */

@Component({
  selector: 'acceleration-graphs',
  templateUrl: './acceleration-graphs.component.html',
  styleUrls: ['./acceleration-graphs.component.css']
})
export class AccelerationGraphs implements OnInit {
  xData: GraphData[] = [];
  yData: GraphData[] = [];

  xMax: number = 0;
  yMax: number = 0;

  maxDataPoints = 400;

  constructor(private storage: Storage) {}

  ngOnInit() {
    this.storage.get(IdentifierDataType.XYZAccel).subscribe((value) => {
      const x1 = decimalPipe(value.values[0]);
      const y1 = decimalPipe(value.values[1]);
      const time = +value.time;
      this.xData.push({
        x: time,
        y: x1
      });

      this.yData.push({
        x: time,
        y: y1
      });

      //checks if there is a new max
      this.xMax = Math.max(Math.abs(x1), this.xMax);
      this.yMax = Math.max(Math.abs(y1), this.yMax);
    });
  }
}

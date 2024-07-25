import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { decimalPipe } from 'src/utils/pipes.utils';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'high-low-cell-graph',
  templateUrl: './high-low-cell-graph.component.html',
  styleUrls: ['./high-low-cell-graph.component.css']
})
export default class HighLowCellGraph implements OnInit {
  highVoltsData: GraphData[] = [];
  lowVoltsData: GraphData[] = [];
  maxDataPoints = 100;

  constructor(private storage: Storage) {}
  ngOnInit() {
    this.storage.get(IdentifierDataType.VOLTS_HIGH).subscribe((value) => {
      this.highVoltsData.push({ x: new Date().getTime(), y: decimalPipe(value.values[0]) });
      if (this.highVoltsData.length >= 100) {
        this.highVoltsData.shift();
      }
    });
    this.storage.get(IdentifierDataType.VOLTS_LOW).subscribe((value) => {
      this.lowVoltsData.push({ x: new Date().getTime(), y: decimalPipe(value.values[0]) });
      if (this.lowVoltsData.length >= 100) {
        this.lowVoltsData.shift();
      }
    });
  }
}

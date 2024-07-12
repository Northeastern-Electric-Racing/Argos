import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'high-low-cell-graph',
  templateUrl: './high-low-cell-graph.component.html',
  styleUrls: ['./high-low-cell-graph.component.css']
})
export default class HighLowCellGraph implements OnInit {
  data1: GraphData[] = [];
  data2: GraphData[] = [];
  maxDataPoints = 100;

  constructor(private storage: Storage) {}
  ngOnInit() {
    this.storage.get(IdentifierDataType.VOLTS_HIGH).subscribe((value) => {
      this.data1.push({ x: new Date().getTime(), y: parseInt(value.values[0]) });
      if (this.data1.length >= 100) {
        this.data1.shift();
      }
    });
    this.storage.get(IdentifierDataType.VOLTS_LOW).subscribe((value) => {
      this.data2.push({ x: new Date().getTime(), y: parseInt(value.values[0]) });
      if (this.data2.length >= 100) {
        this.data2.shift();
      }
    });
  }

  pushWithTime(time: number, value: number) {
    this.data1.push({ x: time, y: value });
    if (this.data1.length >= this.maxDataPoints) {
      this.data1.shift();
    }
    this.data2.push({ x: new Date().getTime(), y: value });
    if (this.data2.length >= 100) {
      this.data2.shift();
    }
  }
}

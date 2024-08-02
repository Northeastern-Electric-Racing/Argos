import { Component, Input, OnInit } from '@angular/core';
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
  @Input() resetGraph: boolean = false;

  constructor(private storage: Storage) {}
  ngOnInit() {
    this.storage.get(IdentifierDataType.VOLTS_HIGH).subscribe((value) => {
      if (this.resetGraph) {
        this.resetData();
      }
      this.highVoltsData.push({ x: new Date().getTime(), y: decimalPipe(value.values[0]) });
    });
    this.storage.get(IdentifierDataType.VOLTS_LOW).subscribe((value) => {
      if (this.resetGraph) {
        this.resetData();
      }
      this.lowVoltsData.push({ x: new Date().getTime(), y: decimalPipe(value.values[0]) });
    });
  }

  resetData() {
    this.lowVoltsData = [];
    this.highVoltsData = [];
  }
}

import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'cell-temp-graph',
  templateUrl: './cell-temp-graph.component.html',
  styleUrls: ['./cell-temp-graph.component.css']
})
export default class CellTempGraph implements OnInit {
  data: GraphData[] = [];
  maxDataPoints = 100;

  constructor(private storage: Storage) {}
  ngOnInit() {
    this.storage.get(IdentifierDataType.CELL_TEMP_HIGH).subscribe((value) => {
      this.data.push({ x: new Date().getTime(), y: parseInt(value.values[0]) });
      if (this.data.length >= 100) {
        this.data.shift();
      }
    });
  }
}

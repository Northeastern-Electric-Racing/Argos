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
  cellTempData: GraphData[] = [];
  maxDataPoints = 100;

  constructor(private storage: Storage) {}
  ngOnInit() {
    this.storage.get(IdentifierDataType.CELL_TEMP_HIGH).subscribe((value) => {
      this.cellTempData.push({ x: new Date().getTime(), y: parseInt(value.values[0]) });
      if (this.cellTempData.length >= 100) {
        this.cellTempData.shift();
      }
    });
  }
}

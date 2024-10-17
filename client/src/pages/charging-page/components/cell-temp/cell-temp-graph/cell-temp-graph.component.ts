import { Component, Input, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'cell-temp-graph',
  templateUrl: './cell-temp-graph.component.html',
  styleUrls: ['./cell-temp-graph.component.css']
})
export default class CellTempGraph implements OnInit {
  @Input() maxCellTempData: GraphData[] = [];
  constructor(private storage: Storage) {}
  ngOnInit() {}
}

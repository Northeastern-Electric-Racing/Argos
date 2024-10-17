import { Component, Input, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'high-low-cell-graph',
  templateUrl: './high-low-cell-graph.component.html',
  styleUrls: ['./high-low-cell-graph.component.css']
})
export default class HighLowCellGraph implements OnInit {
  @Input() highVoltsData: GraphData[] = [];
  @Input() lowVoltsData: GraphData[] = [];

  constructor(private storage: Storage) {}
  ngOnInit() {}
}

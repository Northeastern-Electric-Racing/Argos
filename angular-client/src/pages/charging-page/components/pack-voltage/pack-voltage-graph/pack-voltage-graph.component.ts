import { Component, Input, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'pack-voltage-graph',
  templateUrl: './pack-voltage-graph.component.html',
  styleUrls: ['./pack-voltage-graph.component.css']
})
export default class PackVoltageGraph implements OnInit {
  @Input() packVoltData: GraphData[] = [];

  constructor(private storage: Storage) {}
  ngOnInit() {}
}

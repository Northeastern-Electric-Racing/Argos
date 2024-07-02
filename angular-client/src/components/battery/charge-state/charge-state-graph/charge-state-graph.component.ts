import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'charge-state-graph',
  templateUrl: './charge-state-graph.component.html',
  styleUrls: ['./charge-state-graph.component.css']
})
export default class ChargeStateGraph implements OnInit {
  data: GraphData[] = [];
  maxDataPoints = 100;

  constructor(private storage: Storage) {}
  ngOnInit() {
    this.storage.get(IdentifierDataType.STATE_OF_CHARGE).subscribe((value) => {
      this.data.push({ x: new Date().getTime(), y: parseInt(value.values[0]) });
      if (this.data.length >= 100) {
        this.data.shift();
      }
    });
  }
}

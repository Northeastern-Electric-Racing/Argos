import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'current-graph',
  templateUrl: './current-graph.component.html',
  styleUrls: ['./current-graph.component.css']
})
export default class CurrentGraph implements OnInit {
  currentData: GraphData[] = [];
  maxDataPoints = 100;

  constructor(private storage: Storage) {}
  ngOnInit() {
    this.storage.get(IdentifierDataType.CURRENT).subscribe((value) => {
      this.currentData.push({ x: new Date().getTime(), y: parseInt(value.values[0]) });
      if (this.currentData.length >= 100) {
        this.currentData.shift();
      }
    });
  }
}

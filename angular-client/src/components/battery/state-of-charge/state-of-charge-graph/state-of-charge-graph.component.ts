import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { GraphData } from 'src/utils/types.utils';

@Component({
  selector: 'state-of-charge-graph',
  templateUrl: './state-of-charge-graph.component.html',
  styleUrls: ['./state-of-charge-graph.component.css']
})
// This component is not currently used in the application, hence the commented out init.
export default class StateOfChargeGraph implements OnInit {
  data: GraphData[] = [];
  maxDataPoints = 100;

  constructor(private storage: Storage) {}
  ngOnInit() {
    // this.storage.get(IdentifierDataType.STATE_OF_CHARGE).subscribe((value) => {
    //   this.data.push({ x: new Date().getTime(), y: parseInt(value.values[0]) });
    //   if (this.data.length >= 100) {
    //     this.data.shift();
    //   }
    // });
  }
}

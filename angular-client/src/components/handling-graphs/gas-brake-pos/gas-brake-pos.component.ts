import { Component, OnInit } from '@angular/core';
import Storage from 'src/services/storage.service';
import { IdentifierDataType } from 'src/utils/enumerations/identifier-data-type';
import { GraphData } from 'src/utils/types.utils';

// this is a line chart with two lines, one for the gas pedal and one for the brake pedal

@Component({
  selector: 'gas-brake-pos',
  templateUrl: './gas-brake-pos.component.html',
  styleUrls: ['./gas-brake-pos.component.css']
})
export default class GasBrakePos implements OnInit {
  gasData: GraphData[] = [];
  brakeData: GraphData[] = [];
  // currently info-graph and graph component hardcoded to do only single line, line charts.
  // instead of having GraphData as x,y then setting series = {name: blah, data = data} inside graphcomponent
  // i think have option for incoming graph component data be an additional type called SeriesData that is series form
  // {name: blah, data = data}[] and then act accordingly based off given type
  data: { name: string; data: GraphData[] }[] = [];
  maxDataPoints = 200;

  constructor(private storage: Storage) {}
  ngOnInit() {
    this.storage.get(IdentifierDataType.GASPOS).subscribe((value) => {
      this.gasData.push({ x: new Date().getTime(), y: parseInt(value.values[0]) });
      if (this.gasData.length > 100) {
        this.gasData.shift();
      }
    });

    this.storage.get(IdentifierDataType.BRAKEPOS).subscribe((value) => {
      this.brakeData.push({ x: new Date().getTime(), y: parseInt(value.values[0]) });
      if (this.brakeData.length > 100) {
        this.brakeData.shift();
      }
    });

    this.data = [
      { name: 'Gas', data: this.gasData },
      { name: 'Brake', data: this.brakeData }
    ];
  }
}

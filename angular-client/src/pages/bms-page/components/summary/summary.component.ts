import { Component } from '@angular/core';

@Component({
  selector: 'app-summary',
  templateUrl: './summary.component.html',
  styleUrls: ['./summary.component.css']
})
export class SummaryComponent {
  segments = [
    { temp: 31, voltage: 12.1, chipTemp: 15 },
    { temp: 29, voltage: 11.5, chipTemp: 16 },
    { temp: 30, voltage: 12.4, chipTemp: 18 },
    { temp: 28, voltage: 11.5, chipTemp: 17 },
    { temp: 32, voltage: 11.8, chipTemp: 15 }
  ];
}

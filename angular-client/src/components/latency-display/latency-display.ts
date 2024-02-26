import { Component, Input } from '@angular/core';

@Component({
  selector: 'latency-display',
  templateUrl: './latency-display.html',
  styleUrls: ['./latency-display.css']
})
export default class LatencyDisplay {
  @Input() latency: number = 0;
  @Input() lowVal: number = 0;
  @Input() medVal: number = 50;
  @Input() highVal: number = 100;
  @Input() height: number = 100;
  @Input() width: number = 100;

  mapColor = (currVal: number, lowVal: number, medVal: number, highVal: number): string => {
    if (currVal < medVal - medVal / 2) {
      return '#53e400';
    }
    if (currVal > medVal + medVal / 2) {
      return 'red';
    }
    return 'yellow';
  };
}

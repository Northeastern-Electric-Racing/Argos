import { Component, Input } from '@angular/core';

@Component({
  selector: 'latency-display',
  templateUrl: './latency-display.html',
  styleUrls: ['./latency-display.css']
})
export default class LatencyDisplay {
  @Input() latency: number = 90;
  @Input() lowVal: number = 0;
  @Input() medVal: number = 50;
  @Input() highVal: number = 100;

  mapColor = (latency: number, lowVal: number, medVal: number, highVal: number): string => {
    if (latency < (3 * medVal) / 4) {
      return '#53e400';
    }
    if (latency > (3 * medVal) / 4 && latency < (3 * medVal) / 2) {
      return 'yellow';
    }
    return 'red';
  };
}

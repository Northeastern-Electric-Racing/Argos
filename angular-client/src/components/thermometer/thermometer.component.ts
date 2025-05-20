import { Component, Input } from '@angular/core';

@Component({
    selector: 'thermometer',
    templateUrl: './thermometer.component.html',
    styleUrls: ['./thermometer.component.css'],
    standalone: true
})
export default class ThermometerComponent {
  @Input() temperature: number = 0;
  @Input() min: number = 0;
  @Input() max: number = 100;

  mapColor = (value: number, min: number, max: number) => {
    const range = max - min;

    if (value < min + range / 2) {
      return 'blue';
    }
    if (value < min + range / 1.5) {
      return 'yellow';
    }
    return 'red';
  };
}

import { Component, input } from '@angular/core';

@Component({
  selector: 'thermometer',
  templateUrl: './thermometer.component.html',
  styleUrls: ['./thermometer.component.css'],
  standalone: true
})
export default class ThermometerComponent {
  temperature = input<number>(0);
  min = input<number>(0);
  max = input<number>(100);

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

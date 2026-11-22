import { Component, input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'thermometer',
  templateUrl: './thermometer.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  // The glass, its bulb and the mercury are drawn inside a 75% box of the consumer's container.
  host: { class: 'relative flex h-3/4 w-3/4 justify-center' }
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

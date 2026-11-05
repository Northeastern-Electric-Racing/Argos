import { Component, input, ChangeDetectionStrategy } from '@angular/core';

/** A column of children; gap and alignment are inputs, so they stay style bindings. */
@Component({
  selector: 'vstack',
  templateUrl: './vstack.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export default class VStackComponent {
  spacing = input<string>('5px');
  align = input<string>('center');
}

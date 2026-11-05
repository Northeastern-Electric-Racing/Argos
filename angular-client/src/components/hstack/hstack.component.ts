import { Component, input, ChangeDetectionStrategy } from '@angular/core';

type JusitfyContent = 'space-between' | 'space-around' | 'space-evenly' | 'center' | 'start' | 'end';

type AlignItems = 'center' | 'start' | 'end' | 'stretch';

/** A row of children; gap and alignment are inputs, so they stay style bindings. */
@Component({
  selector: 'hstack',
  templateUrl: './hstack.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export default class HStackComponent {
  spacing = input<string>('20px');
  justifyContent = input<JusitfyContent>('center');
  alignItems = input<AlignItems>('center');
}

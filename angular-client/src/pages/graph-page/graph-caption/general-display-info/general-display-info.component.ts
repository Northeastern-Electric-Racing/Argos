import { Component, input } from '@angular/core';
import { Run } from 'src/utils/types.utils';

@Component({
  selector: 'general-display-info',
  templateUrl: './general-display-info.component.html',
  host: { class: 'block text-right' }
})
export class GeneralDisplayInfoComponent {
  run = input.required<Run | undefined>();
}

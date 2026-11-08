import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import TypographyComponent from 'src/components/typography/typography.component';
import { Run } from 'src/utils/types.utils';

@Component({
  selector: 'general-display-info',
  templateUrl: './general-display-info.component.html',
  styleUrl: './general-display-info.component.css',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [TypographyComponent]
})
export class GeneralDisplayInfoComponent {
  run = input.required<Run | undefined>();
}

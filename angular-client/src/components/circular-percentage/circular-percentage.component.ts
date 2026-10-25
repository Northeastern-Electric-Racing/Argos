import { Component, computed, input } from '@angular/core';
import Theme from 'src/services/theme.service';
import { InfoBackgroundComponent } from '../info-background/info-background.component';
import TypographyComponent from '../typography/typography.component';

/**
 * Component that displays a percentage using a ring that is colored
 * a percentage of the way according to what percentage is passed
 */

@Component({
  selector: 'circular-percentage',
  templateUrl: './circular-percentage.component.html',
  styleUrls: ['./circular-percentage.component.css'],
  standalone: true,
  imports: [InfoBackgroundComponent, TypographyComponent]
})
export class CircularPercentageComponent {
  dimension = input.required<number>();
  ringColor = input.required<string>();
  percentage = input.required<number>();
  spacing = input<number>(0);

  //values needed for styling and scaling
  backgroundColor: string = Theme.infoBackground;
  emptyAngle: number = 360;
  innerCircleDimension = computed(() => this.dimension() * 0.87);
  percentageFontSize = computed(() => this.dimension() * 0.39);
  percentageSignFontSize = computed(() => this.dimension() * 0.17);
  percentageSignOffset = computed(() => this.dimension() * 0.02);

  getFilledAngle(percentage: number): number {
    return (percentage / 100) * 360;
  }
}

import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { InfoBackgroundComponent } from '../info-background/info-background.component';
import { typographyClass } from 'src/ui/recipes/typography';

/**
 * Component that displays a percentage using a ring that is colored
 * a percentage of the way according to what percentage is passed
 */

@Component({
  selector: 'circular-percentage',
  templateUrl: './circular-percentage.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [InfoBackgroundComponent]
})
export class CircularPercentageComponent {
  dimension = input.required<number>();
  ringColor = input.required<string>();
  percentage = input.required<number>();
  spacing = input<number>(0);

  // The number and its sign scale with the ring, so their sizes (and the sign's lift) stay style bindings.
  protected readonly valueClass = typographyClass('header', 'm-0');
  protected readonly signClass = typographyClass('info-subtitle', 'm-0');
  emptyAngle: number = 360;
  innerCircleDimension = computed(() => this.dimension() * 0.87);
  percentageFontSize = computed(() => this.dimension() * 0.39);
  percentageSignFontSize = computed(() => this.dimension() * 0.17);
  percentageSignOffset = computed(() => this.dimension() * 0.02);

  getFilledAngle(percentage: number): number {
    return (percentage / 100) * 360;
  }
}

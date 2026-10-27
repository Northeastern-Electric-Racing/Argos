import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import Theme from 'src/services/theme.service';

@Component({
  selector: 'battery-percentage',
  templateUrl: 'battery-percentage.component.html',
  styleUrls: ['battery-percentage.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager
})
export class BatteryPercentageComponent {
  percentage = input.required<number>();
  height = input.required<number>();
  width = input.required<number>();

  // Background Styles
  heightpx = computed(() => this.height() + 'px');
  widthpx = computed(() => this.width() + 'px');
  backgroundColor: string = Theme.batteryBack;

  // Fill Styles
  fillWidth = computed(() => this.width() * 0.9 + 'px');
  fillMarginBottom = computed(() => this.height() * 0.05 + 'px');

  // Nub Styles (clicking greys the nub; the CSS transition fades it)
  clicked: boolean = false;
  nubHeight = computed(() => this.height() / 10 + 'px');
  nubWidth = computed(() => this.width() / 2 + 'px');

  // Corner Styles
  roundCorner = computed(() => Math.min(this.width(), this.height()) * 0.05 + 'px');

  getFillHeight = (percentage: number) => {
    return (percentage / 100) * (this.height() * 0.9) + 'px';
  };

  getFillColor = (percentage: number) => {
    if (percentage <= 20) {
      return Theme.battteryLow;
    }
    return Theme.battteryHigh;
  };

  toggleIsCorrect() {
    this.clicked = !this.clicked; // change in data-bound value
  }
}

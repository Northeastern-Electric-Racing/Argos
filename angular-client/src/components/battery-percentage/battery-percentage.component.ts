import { Component, computed, input, signal, ChangeDetectionStrategy } from '@angular/core';
import Theme from 'src/services/theme.service';
import { tw } from 'src/ui/recipes/tw';

/** The nub fades to grey (814's #808080, the control-border token) over a second while clicked. */
const nubClasses = {
  idle: tw('bg-battery-shell transition-colors duration-1000 ease-linear'),
  clicked: tw('bg-control-border transition-colors duration-1000 ease-linear')
} as const;

@Component({
  selector: 'battery-percentage',
  templateUrl: 'battery-percentage.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class BatteryPercentageComponent {
  percentage = input.required<number>();
  height = input.required<number>();
  width = input.required<number>();

  // Background Styles (the shell is the battery-shell token)
  heightpx = computed(() => this.height() + 'px');
  widthpx = computed(() => this.width() + 'px');

  // Fill Styles
  fillWidth = computed(() => this.width() * 0.9 + 'px');
  fillMarginBottom = computed(() => this.height() * 0.05 + 'px');

  // Nub Styles
  clicked = signal(false);
  protected nubClass = computed(() => (this.clicked() ? nubClasses.clicked : nubClasses.idle));
  nubHeight = computed(() => this.height() / 10 + 'px');
  nubWidth = computed(() => this.width() / 2 + 'px');

  // Corner Styles
  roundCorner = computed(() => Math.min(this.width(), this.height()) * 0.05 + 'px');

  getFillHeight = (percentage: number) => {
    return (percentage / 100) * (this.height() * 0.9) + 'px';
  };

  /** The fill's level: low at 20% and below, high above; its colour is the matching Theme battery colour. */
  level = computed(() => (this.percentage() <= 20 ? 'low' : 'high'));
  fillColor = computed(() => (this.level() === 'low' ? Theme.battteryLow : Theme.battteryHigh));

  toggleIsCorrect() {
    this.clicked.update((clicked) => !clicked);
  }
}

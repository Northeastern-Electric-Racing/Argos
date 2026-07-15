import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'gauge-stat',
  templateUrl: './gauge-stat.component.html',
  styleUrl: './gauge-stat.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe]
})
export class GaugeStatComponent {
  value = input.required<number>();
  unit = input<string>('');
  /** Optional color for the value; falls back to CSS default when empty. */
  color = input<string>('');
  precision = input<number>(0);

  digitsInfo = computed(() => `1.0-${this.precision()}`);
}

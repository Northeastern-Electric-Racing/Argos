import { Component, computed, input } from '@angular/core';
import Theme from 'src/services/theme.service';

/**
 * Compact battery level indicator sized for the At A Glance bar.
 * Fixed 18×44px footprint. Self-contained — no external wrapper needed.
 */
@Component({
  selector: 'battery-level-indicator',
  templateUrl: './battery-level-indicator.component.html',
  styleUrl: './battery-level-indicator.component.css',
  standalone: true
})
export class BatteryLevelIndicatorComponent {
  percentage = input<number>(0);

  fillHeight = computed(() => Math.max(0, Math.min(100, this.percentage())) + '%');
  fillColor = computed(() => (this.percentage() <= 20 ? Theme.battteryLow : Theme.battteryHigh));
}

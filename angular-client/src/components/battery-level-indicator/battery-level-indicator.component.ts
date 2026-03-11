import { Component, Input, OnChanges } from '@angular/core';
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
export class BatteryLevelIndicatorComponent implements OnChanges {
  @Input() percentage: number = 0;

  fillHeight = '0%';
  fillColor = Theme.battteryHigh;

  ngOnChanges(): void {
    this.fillHeight = Math.max(0, Math.min(100, this.percentage)) + '%';
    this.fillColor = this.percentage <= 20 ? Theme.battteryLow : Theme.battteryHigh;
  }
}

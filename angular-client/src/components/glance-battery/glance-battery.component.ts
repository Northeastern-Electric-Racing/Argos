import { Component, Input, OnChanges } from '@angular/core';

/**
 * Compact battery widget sized for the At A Glance bar.
 * Fixed 20×36px footprint. Self-contained — no external wrapper needed.
 */
@Component({
  selector: 'glance-battery',
  templateUrl: './glance-battery.component.html',
  styleUrl: './glance-battery.component.css',
  standalone: true
})
export class GlanceBatteryComponent implements OnChanges {
  @Input() percentage: number = 0;

  fillHeight = '0%';
  fillColor = '#1ae824';

  ngOnChanges(): void {
    this.fillHeight = Math.max(0, Math.min(100, this.percentage)) + '%';
    this.fillColor = this.percentage <= 20 ? '#f50905' : '#1ae824';
  }
}

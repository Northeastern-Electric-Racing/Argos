import { Component, input } from '@angular/core';

/**
 * Compact thermometer widget sized for the At A Glance bar.
 * Self-contained — no external sizing wrapper needed.
 */
@Component({
  selector: 'glance-thermometer',
  templateUrl: './glance-thermometer.component.html',
  styleUrl: './glance-thermometer.component.css',
  standalone: true
})
export class GlanceThermometerComponent {
  temperature = input<number>(0);
  min = input<number>(0);
  max = input<number>(100);

  get mercuryHeight(): string {
    const clamped = Math.max(this.min(), Math.min(this.temperature(), this.max()));
    const pct = ((clamped - this.min()) / (this.max() - this.min())) * 100;
    // Mercury fills 0–70% of the tube area (leaving room for glass top)
    return Math.max(5, pct * 0.7) + '%';
  }

  get mercuryColor(): string {
    const range = this.max() - this.min();
    if (this.temperature() < this.min() + range / 2) return '#3b82f6';
    if (this.temperature() < this.min() + range / 1.5) return '#eab308';
    return '#ef4444';
  }
}

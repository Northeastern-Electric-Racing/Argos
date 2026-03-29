import { Component, input, computed } from '@angular/core';

/**
 * Backlit annunciator plate indicator — mimics vintage panel-mount
 * status lights found on aircraft and radio equipment.
 *
 * When inactive, the plate is dark with barely visible text.
 * When active, the plate glows with the specified color and the text
 * becomes bright white.
 */
@Component({
  selector: 'indicator-light',
  templateUrl: './indicator-light.component.html',
  styleUrls: ['./indicator-light.component.css'],
  standalone: true
})
export default class IndicatorLightComponent {
  /** The text displayed on the plate (e.g., "FAULTED", "ENABLED") */
  label = input.required<string>();

  /** Whether the indicator is active (lit) */
  active = input<boolean>(false);

  /** The glow color when active: 'red', 'green', 'amber', or a custom CSS color */
  color = input<string>('red');

  /** Font size in px */
  fontSize = input<number>(14);

  /** Resolved color values for active state */
  glowColor = computed(() => {
    const presets: Record<string, { bg: string; glow: string; text: string }> = {
      red: { bg: '#4a1515', glow: '#cc3030', text: '#cc3030' },
      green: { bg: '#1a3318', glow: '#4a9e3e', text: '#4a9e3e' },
      amber: { bg: '#3d3010', glow: '#c8911e', text: '#c8911e' }
    };
    return presets[this.color()] ?? { bg: this.color(), glow: this.color(), text: '#ffffff' };
  });
}

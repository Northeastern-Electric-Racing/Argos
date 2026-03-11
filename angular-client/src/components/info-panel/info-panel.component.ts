import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import Theme from 'src/services/theme.service';

/**
 * Lightweight panel wrapper with configurable padding, sizing, and optional title.
 *
 * Unlike info-background, this component:
 * - Lets consumers control padding via `padding` input (CSS shorthand)
 * - Supports `width` mode: 'full' (100%) or 'fit' (fit-content)
 * - Has no fixed height — it wraps content tightly
 * - Title bar uses plain CSS instead of typography component
 *
 * Usage:
 *   <info-panel title="At A Glance" svgIcon="battery_charging_2" padding="4px 8px">
 *     ...content...
 *   </info-panel>
 */
@Component({
  selector: 'info-panel',
  templateUrl: './info-panel.component.html',
  styleUrl: './info-panel.component.css',
  standalone: true,
  imports: [MatIcon]
})
export class InfoPanelComponent {
  /** Panel title — omit to hide the title bar entirely */
  title = input<string>('');
  /** Material font icon name */
  icon = input<string>('');
  /** Registered SVG icon name */
  svgIcon = input<string>('');
  /** Background color (Theme enum or CSS color) */
  backgroundColor = input<string>(Theme.infoBackground);
  /** CSS padding shorthand (e.g. '4px 8px', '12px', '8px 16px 8px 16px') */
  padding = input<string>('8px');
  /** Width mode: 'full' stretches to 100%, 'fit' wraps content */
  widthMode = input<'full' | 'fit'>('full');
}

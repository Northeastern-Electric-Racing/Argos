import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { UiIconComponent } from 'src/ui/icon/icon.component';
import Theme from 'src/services/theme.service';
import { tw } from 'src/ui/recipes/tw';

const panelWidth = { full: tw('box-border w-full rounded-md'), fit: tw('box-border w-fit rounded-md') };

/**
 * Lightweight panel wrapper with configurable padding, sizing, and optional title.
 *
 * Unlike info-background, this component:
 * - Lets consumers control padding via `padding` input (CSS shorthand)
 * - Supports `width` mode: 'full' (100%) or 'fit' (fit-content)
 * - Has no fixed height — it wraps content tightly
 * - Title bar uses plain utilities instead of the typography component
 *
 * Usage:
 *   <info-panel title="At A Glance" svgIcon="battery_charging_2" padding="4px 8px">
 *     ...content...
 *   </info-panel>
 */
@Component({
  selector: 'info-panel',
  templateUrl: './info-panel.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  imports: [UiIconComponent]
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

  protected panelClass = computed(() => panelWidth[this.widthMode()]);
}

import { Component, input, computed, ChangeDetectionStrategy } from '@angular/core';
import { cx, tw } from 'src/ui/recipes/tw';
import { legendClass } from '../../efuses.classes';

const plateBase = tw(
  'inline-flex min-w-20 items-center justify-center rounded-[4px] border px-4 py-1.5 transition-colors duration-100 select-none'
);
/** Unlit: a dark plate with a dim legend that still reads at AA (fg-dim, 5:1 on surface-1). */
const unlit = tw('border-surface-3 bg-surface-1 text-fg-dim');
/** Lit: a tinted plate, a glowing edge and the legend in the lamp's colour, each at AA on its tint. */
const lit = {
  red: tw('border-accent bg-accent/15 text-accent-fg'),
  green: tw('border-success bg-success/10 text-success-fg'),
  amber: tw('border-warn bg-warn/10 text-warn')
} as const;

/**
 * Backlit annunciator plate indicator — mimics vintage panel-mount
 * status lights found on aircraft and radio equipment.
 *
 * When inactive, the plate is dark with a dim legend. When active, the plate glows with the specified
 * colour and so does the legend. The legend is followed by a visually hidden ", on" or ", off", so
 * assistive tech hears whether the lamp is lit, not just its name.
 */
@Component({
  selector: 'indicator-light',
  templateUrl: './indicator-light.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  // An opaque base under the plate: a lit plate's tint must compose over surface-1, not the card (4.36:1 there)
  host: { class: 'inline-flex rounded-[4px] bg-surface-1' }
})
export default class IndicatorLightComponent {
  /** The text displayed on the plate (e.g., "FAULTED", "ENABLED") */
  label = input.required<string>();

  /** Whether the indicator is active (lit) */
  active = input<boolean>(false);

  /** The glow colour when active */
  color = input<keyof typeof lit>('red');

  /** Font size in px */
  fontSize = input<number>(14);

  protected readonly legendClass = legendClass;

  protected plateClass = computed(() => cx(plateBase, this.active() ? lit[this.color()] : unlit));
}

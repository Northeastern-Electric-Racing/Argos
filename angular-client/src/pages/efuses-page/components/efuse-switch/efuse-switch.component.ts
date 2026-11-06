import { Component, computed, input, linkedSignal, output, ChangeDetectionStrategy } from '@angular/core';
import { cx, tw } from 'src/ui/recipes/tw';
import { legendClass, panelButtonClass, panelGroupClass } from '../../efuses.classes';

export type EfuseSwitchState = 'ON' | 'OFF' | 'AUTO';

/** An unpressed position is a live button, so its legend stays at AA (fg-dim, 5:1 on surface-1). */
const positionClass = cx(
  panelButtonClass,
  legendClass,
  tw(
    'min-w-22 bg-surface-1 px-6.5 py-3.5 text-fg-dim not-aria-pressed:hover:bg-surface-2 not-aria-pressed:hover:text-fg-muted max-md:min-w-18 max-md:px-4'
  )
);

/** Each position lights in its own colour while pressed: ON green, AUTO amber, OFF red. */
const buttonClasses: Record<EfuseSwitchState, string> = {
  ON: cx(positionClass, tw('aria-pressed:bg-success/10 aria-pressed:text-success-fg')),
  AUTO: cx(positionClass, tw('aria-pressed:bg-warn/10 aria-pressed:text-warn')),
  OFF: cx(positionClass, tw('aria-pressed:bg-accent/15 aria-pressed:text-accent-fg'))
};

/**
 * Multi-position momentary switch — styled to match the annunciator
 * plate indicator lights used elsewhere on the eFuse page.
 *
 * A named group of buttons; the selected one is aria-pressed. Clicking
 * the currently active option does nothing; clicking a different option
 * selects it and emits it.
 *
 * The available options are configurable — pass ['ON', 'OFF'] for a
 * simple two-state switch, or ['ON', 'OFF', 'AUTO'] for eFuses that
 * support automatic firmware control.
 *
 * Controlled: a press shows at once, and `selectedState` (Calypso's
 * state, the source of truth) always wins when it changes, so a parent
 * reverts a failed command by setting it back.
 */
@Component({
  selector: 'efuse-switch',
  templateUrl: './efuse-switch.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export default class EfuseSwitchComponent {
  /** Font size in px for the button labels */
  fontSize = input<number>(14);

  /** Disable interactions while keeping state display live */
  disabled = input<boolean>(false);

  /** The set of states available to this switch */
  options = input<EfuseSwitchState[]>(['ON', 'OFF']);

  /** Selected state from Calypso (source of truth) */
  selectedState = input<EfuseSwitchState | null>(null);

  /** The group's accessible name, e.g. "Brake mode" */
  ariaLabel = input<string>('eFuse mode');

  protected readonly groupClass = panelGroupClass;
  protected readonly buttonClasses = buttonClasses;

  /**
   * Ordered options — ensures AUTO is always in the middle when present.
   * Canonical order: ON, AUTO, OFF.
   */
  orderedOptions = computed<EfuseSwitchState[]>(() => {
    const canonical: EfuseSwitchState[] = ['ON', 'AUTO', 'OFF'];
    return canonical.filter((s) => this.options().includes(s));
  });

  /** The currently selected state: Calypso's, else AUTO when it is an option, else OFF */
  selected = linkedSignal<EfuseSwitchState>(
    () => this.selectedState() ?? (this.options().includes('AUTO') ? 'AUTO' : 'OFF')
  );

  /** Emitted when the user selects a new state */
  stateChange = output<EfuseSwitchState>();

  select(state: EfuseSwitchState): void {
    if (this.disabled()) return;
    if (state === this.selected()) return;
    this.selected.set(state);
    this.stateChange.emit(state);
  }
}

import { Component, computed, input, output, signal, OnInit } from '@angular/core';

export type EfuseSwitchState = 'ON' | 'OFF' | 'AUTO';

/**
 * Multi-position momentary switch — styled to match the annunciator
 * plate indicator lights used elsewhere on the eFuse page.
 *
 * Only one option can be active at a time. Clicking the currently
 * active option does nothing; clicking a different option selects it
 * and deselects the previous one.
 *
 * The available options are configurable — pass ['ON', 'OFF'] for a
 * simple two-state switch, or ['ON', 'OFF', 'AUTO'] for eFuses that
 * support automatic firmware control.
 *
 * Emits the newly selected state via the `stateChange` output so
 * the parent can send the appropriate CAN message.
 */
@Component({
  selector: 'efuse-switch',
  templateUrl: './efuse-switch.component.html',
  styleUrls: ['./efuse-switch.component.css'],
  standalone: true
})
export default class EfuseSwitchComponent implements OnInit {
  /** Font size in px for the button labels */
  fontSize = input<number>(14);

  /** The set of states available to this switch */
  options = input<EfuseSwitchState[]>(['ON', 'OFF']);

  /**
   * Ordered options — ensures AUTO is always in the middle when present.
   * Canonical order: ON, AUTO, OFF.
   */
  orderedOptions = computed<EfuseSwitchState[]>(() => {
    const canonical: EfuseSwitchState[] = ['ON', 'AUTO', 'OFF'];
    return canonical.filter((s) => this.options().includes(s));
  });

  /** The currently selected state */
  selected = signal<EfuseSwitchState>('OFF');

  /** Emitted when the user selects a new state */
  stateChange = output<EfuseSwitchState>();

  ngOnInit(): void {
    // Default to AUTO when it is an available option, otherwise OFF
    const opts = this.options();
    this.selected.set(opts.includes('AUTO') ? 'AUTO' : 'OFF');
  }

  select(state: EfuseSwitchState): void {
    if (state === this.selected()) return;
    this.selected.set(state);
    this.stateChange.emit(state);
  }
}

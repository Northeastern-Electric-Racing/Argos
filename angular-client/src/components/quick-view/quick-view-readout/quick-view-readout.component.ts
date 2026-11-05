import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { QuickViewReadout } from 'src/services/quick-view.service';

/** Shown until a readout has a usable value. */
const PLACEHOLDER = '–';

/**
 * The one chip every quick-view readout renders with: icon, value and unit over a label, an
 * optional detail line, and an optional labelled status dot. Generalises the eFuses LV battery
 * chip (#705) into a config-driven chip, so every page's readouts look and behave the same.
 */
@Component({
  selector: 'quick-view-readout',
  templateUrl: './quick-view-readout.component.html',
  styleUrl: './quick-view-readout.component.css',
  imports: [MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class QuickViewReadoutComponent {
  readonly readout = input.required<QuickViewReadout>();

  protected readonly value = computed(() => {
    const { value, decimals = 0 } = this.readout();
    const current = value();
    if (typeof current === 'string') return current;
    return current !== undefined && isFinite(current) ? current.toFixed(decimals) : PLACEHOLDER;
  });

  protected readonly detail = computed(() => this.readout().detail?.());
  protected readonly status = computed(() => this.readout().status?.());
}

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/** Status a quick-view chip's dot can show; the dot is omitted when there is no status. */
export type QuickViewChipStatus = 'ok' | 'warn' | 'fault';

/**
 * One readout in a page's quick view (`<status-bar>`): a value and unit over a short label,
 * an optional detail line (e.g. which cell), and an optional status dot.
 *
 * Presentational — the page decides what to show and wires the live value in. Shared across
 * pages so every quick view looks the same, while each page keeps its own readouts.
 */
@Component({
  selector: 'quick-view-chip',
  templateUrl: './quick-view-chip.component.html',
  styleUrl: './quick-view-chip.component.css',
  imports: [MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class QuickViewChipComponent {
  /** Short uppercase label under the value, e.g. "Pack Voltage". */
  readonly label = input.required<string>();
  /** Live value: numbers are formatted to `precision`, text is shown as is; undefined until data arrives. */
  readonly value = input<number | string>();
  readonly unit = input('');
  readonly precision = input(1);
  /** Optional extra line, e.g. the cell and chip a reading came from. */
  readonly detail = input('');
  /** Optional Material svgIcon name shown at the left of the chip. */
  readonly icon = input('');
  readonly status = input<QuickViewChipStatus>();
  /** Accessible label for the status dot, so status is not conveyed by color alone (WCAG 1.4.1). */
  readonly statusLabel = input('');

  protected readonly formattedValue = computed(() => {
    const value = this.value();
    if (typeof value === 'string') return value;
    return value !== undefined && isFinite(value) ? value.toFixed(this.precision()) : '–';
  });
}

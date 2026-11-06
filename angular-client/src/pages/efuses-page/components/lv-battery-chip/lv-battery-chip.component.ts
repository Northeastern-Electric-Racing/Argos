import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { tw } from 'src/ui/recipes/tw';

/** The status dot: the shared battery-low token while the LV low-voltage fault is active, battery-high otherwise. */
const LV_FAULT_DOT = tw('size-2.5 shrink-0 rounded-full bg-battery-low');
const LV_NORMAL_DOT = tw('size-2.5 shrink-0 rounded-full bg-battery-high');

/**
 * LV Battery chip for the eFuses status bar: the live voltage (fixed-width digits, so the right-anchored
 * shrink-to-fit panel never re-flows on an update) over a "LV Battery" subtitle,
 * with a status dot that is green normally and red on fault.
 *
 * Presentational — the host supplies the live voltage and the firmware low-voltage fault flag.
 * The warning is driven purely by the fault flag, never a hardcoded voltage cutoff. This is the
 * physical LV battery (VCU/LV/voltage), distinct from the LV eFuse card (VCU/eFuses/LV/Voltage).
 */
@Component({
  selector: 'lv-battery-chip',
  templateUrl: './lv-battery-chip.component.html',
  imports: [MatIcon],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class LvBatteryChipComponent {
  /** Live LV battery voltage (V); undefined until the first reading arrives. */
  readonly voltage = input<number>();
  /** Whether the firmware LV low-voltage fault flag is active. */
  readonly faulted = input(false);

  protected readonly value = computed(() => {
    const voltage = this.voltage();
    return voltage !== undefined && isFinite(voltage) ? voltage.toFixed(2) : '–';
  });

  protected readonly dotClass = computed(() => (this.faulted() ? LV_FAULT_DOT : LV_NORMAL_DOT));

  /** Accessible label so the fault state is not conveyed by color alone (WCAG 1.4.1). */
  protected readonly dotLabel = computed(() => (this.faulted() ? 'LV battery fault' : 'LV battery nominal'));
}

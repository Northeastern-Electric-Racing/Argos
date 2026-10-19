import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import QuickViewChipComponent from 'src/components/quick-view-chip/quick-view-chip.component';

/**
 * LV Battery chip for the eFuses status bar: the live voltage over a "LV Battery" subtitle,
 * with a status dot that is green normally and red on fault. Built on the shared quick-view-chip.
 *
 * Presentational — the host supplies the live voltage and the firmware low-voltage fault flag.
 * The warning is driven purely by the fault flag, never a hardcoded voltage cutoff. This is the
 * physical LV battery (VCU/LV/voltage), distinct from the LV eFuse card (VCU/eFuses/LV/Voltage).
 */
@Component({
  selector: 'lv-battery-chip',
  templateUrl: './lv-battery-chip.component.html',
  styleUrl: './lv-battery-chip.component.css',
  imports: [QuickViewChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class LvBatteryChipComponent {
  /** Live LV battery voltage (V); undefined until the first reading arrives. */
  readonly voltage = input<number>();
  /** Whether the firmware LV low-voltage fault flag is active. */
  readonly faulted = input(false);

  /** Accessible label so the fault state is not conveyed by color alone (WCAG 1.4.1). */
  protected readonly dotLabel = computed(() => (this.faulted() ? 'LV battery fault' : 'LV battery nominal'));
}

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import Storage from 'src/services/storage.service';
import { activeFaultNames, CHARGER_FAULTS } from 'src/utils/fault.utils';
import { topics } from 'src/utils/topic.utils';
import QuickViewChipComponent, { QuickViewChipStatus } from 'src/components/quick-view-chip/quick-view-chip.component';
import { BMSMODE } from '../BMS-mode/BMS-mode-display.component';

/**
 * The Charging page's quick-view readouts, projected into the page's `<status-bar>`: pack-level
 * charging state that should stay in sight while the cell graphs below are scrolled to.
 */
@Component({
  selector: 'charging-quick-view',
  templateUrl: './charging-quick-view.component.html',
  styleUrl: './charging-quick-view.component.css',
  imports: [QuickViewChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class ChargingQuickViewComponent {
  private storage = inject(Storage);

  private latest = (topic: string) => toSignal(this.storage.get(topic).pipe(map((v) => parseFloat(v.values[0]))));

  // SoC is published as a 0–1 fraction (see bms-at-a-glance).
  private soc = this.latest(topics.stateOfCharge());
  protected socPercent = computed(() => {
    const soc = this.soc();
    return soc === undefined ? undefined : soc * 100;
  });
  protected packVoltage = this.latest(topics.packVoltage());
  protected current = this.latest(topics.current());
  protected highTemp = this.latest(topics.highTempValue());

  private mode = this.latest(topics.bmsMode());
  protected modeName = computed(() => {
    const mode = this.mode();
    return mode === undefined ? undefined : BMSMODE[Math.round(mode)] ?? `Unknown (${mode})`;
  });
  protected modeStatus = computed((): QuickViewChipStatus | undefined => {
    switch (this.mode()) {
      case BMSMODE.CHARGING:
        return 'ok';
      case BMSMODE.FAULTED:
        return 'fault';
      default:
        return undefined;
    }
  });

  private balancing = this.latest(topics.statusBalancing());
  protected balancingLabel = computed(() => {
    const balancing = this.balancing();
    return balancing === undefined ? undefined : balancing === 1 ? 'Yes' : 'No';
  });

  private highVolts = this.latest(topics.highVoltsValue());
  private lowVolts = this.latest(topics.lowVoltsValue());
  protected spreadMillivolts = computed(() => {
    const [high, low] = [this.highVolts(), this.lowVolts()];
    return high === undefined || low === undefined ? undefined : (high - low) * 1000;
  });
  protected spreadDetail = computed(() => {
    const [high, low] = [this.highVolts(), this.lowVolts()];
    return high === undefined || low === undefined ? '' : `${low.toFixed(3)} – ${high.toFixed(3)} V`;
  });

  protected chargerFaults = toSignal(activeFaultNames(this.storage, CHARGER_FAULTS), { requireSync: true });
  protected chargerFaultDetail = computed(() => {
    const extra = this.chargerFaults().length - 1;
    return extra > 0 ? `+${extra} more` : '';
  });
}

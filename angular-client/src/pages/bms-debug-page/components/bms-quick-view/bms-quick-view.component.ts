import { ChangeDetectionStrategy, Component, computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import Storage from 'src/services/storage.service';
import { getCellChipLabel, getChipFromTopicValue } from 'src/utils/bms.utils';
import { activeFaultNames, BMS_CRITICAL_FAULTS } from 'src/utils/fault.utils';
import { topics } from 'src/utils/topic.utils';
import QuickViewChipComponent from 'src/components/quick-view-chip/quick-view-chip.component';

/**
 * The BMS (Accumulator) page's quick-view readouts, projected into the page's `<status-bar>`:
 * pack-level state and the worst cells, kept in sight while scrolling the per-segment rows.
 */
@Component({
  selector: 'bms-quick-view',
  templateUrl: './bms-quick-view.component.html',
  styleUrl: './bms-quick-view.component.css',
  imports: [QuickViewChipComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class BmsQuickViewComponent {
  private storage = inject(Storage);

  private latest = (topic: string) => toSignal(this.storage.get(topic).pipe(map((v) => parseFloat(v.values[0]))));

  /** "Cell: n | Chip: X" for a reading, blank until its location has arrived. */
  private location = (cellTopic: string, chipTopic: string): Signal<string> => {
    const cell = this.latest(cellTopic);
    const chip = this.latest(chipTopic);
    return computed(() => {
      const [c, ch] = [cell(), chip()];
      if (c === undefined && ch === undefined) return '';
      return getCellChipLabel(c, ch === undefined ? undefined : getChipFromTopicValue(ch));
    });
  };

  // SoC is published as a 0–1 fraction (see bms-at-a-glance).
  private soc = this.latest(topics.stateOfCharge());
  protected socPercent = computed(() => {
    const soc = this.soc();
    return soc === undefined ? undefined : soc * 100;
  });
  protected packVoltage = this.latest(topics.packVoltage());

  protected highVolts = this.latest(topics.highVoltsValue());
  protected highVoltsAt = this.location(topics.highVoltsCell(), topics.highVoltsChip());
  protected lowVolts = this.latest(topics.lowVoltsValue());
  protected lowVoltsAt = this.location(topics.lowVoltsCell(), topics.lowVoltsChip());
  protected highTemp = this.latest(topics.highTempValue());
  protected highTempAt = this.location(topics.highTempCell(), topics.highTempChip());

  protected ccl = this.latest(topics.accCCL());
  protected dcl = this.latest(topics.accDCL());

  protected faults = toSignal(activeFaultNames(this.storage, BMS_CRITICAL_FAULTS), { requireSync: true });
  /** The first active fault's name, or None. */
  protected faultsValue = computed(() => this.faults().at(0) ?? 'None');
  protected faultDetail = computed(() => {
    const extra = this.faults().length - 1;
    return extra > 0 ? `+${extra} more` : '';
  });
}

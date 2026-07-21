import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { combineLatest, map } from 'rxjs';
import Storage from 'src/services/storage.service';
import {
  allSegments,
  getCellChipLabel,
  getChipFromTopicValue,
  getConnectionDotStatusColor,
  segmentInfo
} from 'src/utils/bms.utils';
import { topics } from 'src/utils/topic.utils';
import { BatteryLevelIndicatorComponent } from '../../../../components/battery-level-indicator/battery-level-indicator.component';
import { GlanceThermometerComponent } from '../../../../components/glance-thermometer/glance-thermometer.component';
import { InfoPanelComponent } from '../../../../components/info-panel/info-panel.component';
import { StatDisplayListComponent } from '../../../../components/stat-display-list/stat-display-list.component';
import { StatDisplayComponent } from '../../../../components/stat-display/stat-display.component';

@Component({
  selector: 'bms-at-a-glance',
  templateUrl: './bms-at-a-glance.component.html',
  styleUrl: './bms-at-a-glance.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    InfoPanelComponent,
    StatDisplayListComponent,
    StatDisplayComponent,
    GlanceThermometerComponent,
    BatteryLevelIndicatorComponent
  ]
})
export class BmsAtAGlanceComponent {
  private storage = inject(Storage);

  protected packVoltage = toSignal(
    combineLatest(allSegments.map((seg) => this.storage.get(segmentInfo(seg).totalVoltageKey))).pipe(
      map((segments) => segments.reduce((sum, v) => sum + parseFloat(v.values[0]), 0))
    )
  );
  protected packTemp = toSignal(this.storage.get(topics.packTemp()).pipe(map((v) => parseInt(v.values[0]))));
  // SoC is published as a 0–1 fraction, the battery indicator wants a 0–100 percent.
  protected chargeState = toSignal(this.storage.get(topics.stateOfCharge()).pipe(map((v) => parseFloat(v.values[0]))));
  protected chargeStatePercent = computed(() => (this.chargeState() ?? 0) * 100);

  protected balancingDutyCycle = toSignal(
    this.storage.get(topics.balancingDutyCycle()).pipe(map((v) => parseFloat(v.values[0])))
  );

  protected highVoltsValue = toSignal(this.storage.get(topics.highVoltsValue()).pipe(map((v) => parseFloat(v.values[0]))));
  private highVoltsChip = toSignal(
    this.storage.get(topics.highVoltsChip()).pipe(map((v) => getChipFromTopicValue(parseInt(v.values[0]))))
  );
  private highVoltsCell = toSignal(this.storage.get(topics.highVoltsCell()).pipe(map((v) => parseInt(v.values[0]))));
  protected highVoltsLabel = computed(() => getCellChipLabel(this.highVoltsCell(), this.highVoltsChip()));

  protected lowVoltsValue = toSignal(this.storage.get(topics.lowVoltsValue()).pipe(map((v) => parseFloat(v.values[0]))));
  private lowVoltsChip = toSignal(
    this.storage.get(topics.lowVoltsChip()).pipe(map((v) => getChipFromTopicValue(parseInt(v.values[0]))))
  );
  private lowVoltsCell = toSignal(this.storage.get(topics.lowVoltsCell()).pipe(map((v) => parseInt(v.values[0]))));
  protected lowVoltsLabel = computed(() => getCellChipLabel(this.lowVoltsCell(), this.lowVoltsChip()));

  /** Cell voltage spread: highest cell voltage minus lowest cell voltage. */
  protected deltaVoltage = computed(() => {
    const high = this.highVoltsValue();
    const low = this.lowVoltsValue();
    if (high === undefined || low === undefined || isNaN(high) || isNaN(low)) return undefined;
    return high - low;
  });

  protected highTempValue = toSignal(this.storage.get(topics.highTempValue()).pipe(map((v) => parseFloat(v.values[0]))));
  private highTempChip = toSignal(
    this.storage.get(topics.highTempChip()).pipe(map((v) => getChipFromTopicValue(parseInt(v.values[0]))))
  );
  private highTempCell = toSignal(this.storage.get(topics.highTempCell()).pipe(map((v) => parseInt(v.values[0]))));
  protected highTempLabel = computed(() => getCellChipLabel(this.highTempCell(), this.highTempChip()));

  protected enableWidgets = signal(window.innerWidth >= 1000);
  protected getPackVoltageStatusColor = () => getConnectionDotStatusColor(this.packVoltage() ?? 0);

  @HostListener('window:resize')
  onResize() {
    this.enableWidgets.set(window.innerWidth >= 1000);
  }
}

import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { EFUSE_TOPICS } from './efuses-page.topics';

import EfuseCardComponent, { EfuseLockMode } from './components/efuse-card/efuse-card.component';
import RtdsDebugCardComponent from './components/rtds-debug-card/rtds-debug-card.component';
import GridLayoutComponent from 'src/components/grid-layout/grid-layout.component';
import Storage from 'src/services/storage.service';
import StatusBarComponent from 'src/components/status-bar/status-bar.component';
import LvBatteryChipComponent from './components/lv-battery-chip/lv-battery-chip.component';

/**
 * Container for the eFuses page, displays eFuse status and controls.
 */
@Component({
  selector: 'efuses-page',
  styleUrls: ['./efuses-page.component.css'],
  templateUrl: './efuses-page.component.html',
  standalone: true,
  imports: [GridLayoutComponent, EfuseCardComponent, RtdsDebugCardComponent, StatusBarComponent, LvBatteryChipComponent]
})
export default class EfusesPageComponent {
  private storage = inject(Storage);

  readonly EfuseLockMode = EfuseLockMode;
  readonly topics = EFUSE_TOPICS;

  // LV Battery chip data for the status bar. Warning is driven purely by the firmware
  // low-voltage fault flag (never a hardcoded voltage cutoff); this is the physical LV
  // battery (VCU/LV/voltage), distinct from the LV eFuse card (VCU/eFuses/LV/Voltage).
  readonly voltage = toSignal(this.storage.get(EFUSE_TOPICS.VCU.LV.Voltage).pipe(map((v) => parseFloat(v.values[0]))));
  readonly faulted = toSignal(
    this.storage.get(EFUSE_TOPICS.VCU.LV.LowVoltageFault).pipe(map((v) => Number(v.values[0]) === 1)),
    { initialValue: false }
  );
}

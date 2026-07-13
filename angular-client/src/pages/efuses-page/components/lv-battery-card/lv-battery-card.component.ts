import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { InfoBackgroundComponent } from 'src/components/info-background/info-background.component';
import {
  ConnectionDotConfig,
  InfoValueDisplayComponent
} from 'src/components/info-value-dispaly/info-value-display.component';
import Storage from 'src/services/storage.service';
import { EFUSE_TOPICS } from '../../efuses-page.topics';

/** Dot color shown while the LV low-voltage fault is active. */
export const LV_FAULT_COLOR = '#ef4444';
/** Dot color shown while no LV low-voltage fault is active. */
export const LV_NORMAL_COLOR = '#22c55e';

/**
 * Low-voltage battery voltage tile for the eFuses page.
 *
 * Reads the LV battery voltage (VCU/LV/voltage) and turns a warning color when
 * the firmware's LV low-voltage fault flag is active. The threshold is owned by
 * firmware, so the warning is driven purely by the fault flag — never a hardcoded
 * voltage cutoff. This is the physical LV battery, distinct from the LV eFuse card,
 * which reads VCU/eFuses/LV/Voltage.
 */
@Component({
  selector: 'lv-battery-card',
  templateUrl: './lv-battery-card.component.html',
  standalone: true,
  imports: [InfoBackgroundComponent, InfoValueDisplayComponent]
})
export default class LvBatteryCardComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];

  readonly topics = EFUSE_TOPICS.VCU.LV;

  voltage: number | undefined = undefined;
  isFaulted = false;

  ngOnInit(): void {
    this.subscriptions.push(
      this.storage.get(this.topics.Voltage).subscribe((value) => {
        this.voltage = parseFloat(value.values[0]);
      }),
      this.storage.get(this.topics.LowVoltageFault).subscribe((value) => {
        this.isFaulted = Number(value.values[0]) === 1;
      })
    );
  }

  getStatusColor = (): string => {
    return this.isFaulted ? LV_FAULT_COLOR : LV_NORMAL_COLOR;
  };

  getStatusMessage = (): string => {
    return this.isFaulted ? 'LV low-voltage fault' : 'Nominal';
  };

  connectionDotConfig: ConnectionDotConfig = {
    type: 'connection-dot-config',
    getStatusColor: this.getStatusColor,
    getStatusMessage: this.getStatusMessage
  };

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
  }
}

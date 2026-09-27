import { computed, inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import Storage from './storage.service';
import { BmsMode } from 'src/utils/bms.utils';
import { topics } from 'src/utils/topic.utils';

/**
 * Shared BMS state. Subscribes to BMS/Status/State once so every consumer sees the
 * latest value — Storage subjects don't replay, so late per-component subscribers would not.
 */
@Injectable({
  providedIn: 'root'
})
export class BmsStateService {
  private storage = inject(Storage);

  /** Latest BMS/Status/State; undefined until the first message arrives. */
  readonly mode = toSignal(this.storage.get(topics.bmsMode()).pipe(map((v) => parseFloat(v.values[0]) as BmsMode)));

  readonly isCharging = computed(() => this.mode() === BmsMode.CHARGING);
}

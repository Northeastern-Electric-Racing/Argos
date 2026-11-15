import { Component, OnInit, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';

import { gridTileClass } from 'src/ui/recipes/grid';
import { chargingGridClass } from './charging.classes';
import PackVoltageDisplayComponent from './components/pack-voltage/pack-voltage-display/pack-voltage-display.component';
import HighLowCellDisplayComponent from './components/high-low-cell/high-low-cell-display/high-low-cell-display.component';
import CellTempDisplayComponent from './components/cell-temp/cell-temp-display/cell-temp-display.component';
import FaultDisplayComponent from './components/fault-display/fault-display.component';
import CurrentDisplayComponent from './components/battery-current/current-display/current-display.component';
import StateOfChargeDisplayComponent from './components/state-of-charge/state-of-charge-display/state-of-charge-display.component';
import PackTempComponent from './components/pack-temp/pack-temp.component';
import CombinedStatusDisplayComponent from './components/combined-status-display/combined-status-display.component';
import ChargingPageMobileComponent from './charging-page-mobile/charging-page-mobile.component';
import { injectIsMobile } from 'src/ui/layout/mobile';

/**
 * Container for the Charging page, obtains data from the storage service.
 */
@Component({
  selector: 'charging-page',
  templateUrl: './charging-page.component.html',
  imports: [
    ChargingPageMobileComponent,
    PackVoltageDisplayComponent,
    HighLowCellDisplayComponent,
    CellTempDisplayComponent,
    FaultDisplayComponent,
    CurrentDisplayComponent,
    StateOfChargeDisplayComponent,
    PackTempComponent,
    CombinedStatusDisplayComponent
  ],
  changeDetection: ChangeDetectionStrategy.Eager
})
export default class ChargingPageComponent implements OnInit {
  private destroyRef = inject(DestroyRef);
  private storage = inject(Storage);
  location: string = 'No Location Set';
  protected readonly grid = chargingGridClass;
  protected readonly tiles = {
    status: gridTileClass(3, 12),
    stack: gridTileClass(1, 12),
    faults: gridTileClass(2, 12),
    graph: gridTileClass(6, 6)
  };
  isMobile = injectIsMobile();

  ngOnInit() {
    this.storage
      .get(topics.location())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        [this.location] = value.values || ['No Location Set'];
      });
  }
}

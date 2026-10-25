import { Component, inject } from '@angular/core';
import { EFUSE_TOPICS } from './efuses-page.topics';

import EfuseCardComponent, { EfuseLockMode } from './components/efuse-card/efuse-card.component';
import RtdsDebugCardComponent from './components/rtds-debug-card/rtds-debug-card.component';
import GridLayoutComponent from 'src/components/grid-layout/grid-layout.component';
import { QuickViewService } from 'src/services/quick-view.service';
import { lvBatteryReadout } from 'src/components/quick-view/quick-view.readouts';

/**
 * Container for the eFuses page, displays eFuse status and controls.
 */
@Component({
  selector: 'efuses-page',
  styleUrls: ['./efuses-page.component.css'],
  templateUrl: './efuses-page.component.html',
  standalone: true,
  imports: [GridLayoutComponent, EfuseCardComponent, RtdsDebugCardComponent]
})
export default class EfusesPageComponent {
  readonly EfuseLockMode = EfuseLockMode;
  readonly topics = EFUSE_TOPICS;

  constructor() {
    // #705's LV battery chip, now one readout in the app-wide quick view.
    inject(QuickViewService).register([lvBatteryReadout()]);
  }
}

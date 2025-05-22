import { Component, HostListener, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';

import { MatGridList, MatGridTile } from '@angular/material/grid-list';
import PackVoltageDisplayComponent from './components/pack-voltage/pack-voltage-display/pack-voltage-display.component';
import HighLowCellDisplayComponent from './components/high-low-cell/high-low-cell-display/high-low-cell-display.component';
import CellTempDisplayComponent from './components/cell-temp/cell-temp-display/cell-temp-display.component';
import FaultDisplayComponent from './components/fault-display/fault-display.component';
import CurrentDisplayComponent from './components/battery-current/current-display/current-display.component';
import StateOfChargeDisplayComponent from './components/state-of-charge/state-of-charge-display/state-of-charge-display.component';
import PackTempComponent from './components/pack-temp/pack-temp.component';
import CombinedStatusDisplayComponent from './components/combined-status-display/combined-status-display.component';
import ChargingPageMobileComponent from './charging-page-mobile/charging-page-mobile.component';

/**
 * Container for the Charging page, obtains data from the storage service.
 */
@Component({
  selector: 'charging-page',
  styleUrls: ['./charging-page.component.css'],
  templateUrl: './charging-page.component.html',
  standalone: true,
  imports: [
    ChargingPageMobileComponent,
    MatGridList,
    MatGridTile,
    PackVoltageDisplayComponent,
    HighLowCellDisplayComponent,
    CellTempDisplayComponent,
    FaultDisplayComponent,
    CurrentDisplayComponent,
    StateOfChargeDisplayComponent,
    PackTempComponent,
    CombinedStatusDisplayComponent
  ]
})
export default class ChargingPageComponent implements OnInit {
  private storage = inject(Storage);
  time = new Date();
  location: string = 'No Location Set';
  mobileThreshold = 768;
  isMobile = window.innerWidth < this.mobileThreshold;

  ngOnInit() {
    setInterval(() => {
      this.time = new Date();
    }, 1000);

    this.storage.get(DataTypeEnum.LOCATION).subscribe((value) => {
      [this.location] = value.values || ['No Location Set'];
    });
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}

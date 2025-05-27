import { Component, HostListener, Input, OnInit, inject } from '@angular/core';
import Storage from 'src/services/storage.service';
import { DataTypeEnum } from 'src/data-type.enum';

import { DividerComponent } from '../../../components/divider/divider';
import { DatePipe } from '@angular/common';
import FaultDisplayComponent from '../components/fault-display/fault-display.component';
import PackVoltageDisplayComponent from '../components/pack-voltage/pack-voltage-display/pack-voltage-display.component';
import HighLowCellDisplayComponent from '../components/high-low-cell/high-low-cell-display/high-low-cell-display.component';
import CellTempDisplayComponent from '../components/cell-temp/cell-temp-display/cell-temp-display.component';
import PackTempComponent from '../components/pack-temp/pack-temp.component';
import CurrentDisplayComponent from '../components/battery-current/current-display/current-display.component';
import StateOfChargeDisplayComponent from '../components/state-of-charge/state-of-charge-display/state-of-charge-display.component';
import CombinedStatusMobileComponent from '../components/combined-status-display/mobile-view/combined-status-mobile.component';
import VStackComponent from 'src/components/vstack/vstack.component';
import LatencyDisplayComponent from 'src/components/latency-display/latency-display';
import TypographyComponent from 'src/components/typography/typography.component';
import HStackComponent from 'src/components/hstack/hstack.component';
import SidebarToggleComponent from 'src/components/sidebar-toggle/sidebar-toggle.component';

@Component({
  selector: 'charging-page-mobile',
  templateUrl: './charging-page-mobile.component.html',
  styleUrls: ['./charging-page-mobile.component.css'],
  standalone: true,
  imports: [
    DividerComponent,
    DatePipe,
    FaultDisplayComponent,
    PackVoltageDisplayComponent,
    HighLowCellDisplayComponent,
    CellTempDisplayComponent,
    PackTempComponent,
    CurrentDisplayComponent,
    StateOfChargeDisplayComponent,
    CombinedStatusMobileComponent,
    VStackComponent,
    LatencyDisplayComponent,
    TypographyComponent,
    HStackComponent,
    SidebarToggleComponent
  ]
})
export default class ChargingPageMobileComponent implements OnInit {
  private storage = inject(Storage);
  @Input() time = new Date();
  location: string = 'No Location Set';
  mobileThreshold = 1070;
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

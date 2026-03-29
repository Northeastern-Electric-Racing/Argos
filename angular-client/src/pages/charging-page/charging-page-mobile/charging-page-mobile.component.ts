import { Component, HostListener, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import Storage from 'src/services/storage.service';
import { topics } from 'src/utils/topic.utils';

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
export default class ChargingPageMobileComponent implements OnInit, OnDestroy {
  private storage = inject(Storage);
  private subscriptions: Subscription[] = [];
  private timeInterval!: NodeJS.Timeout;
  @Input() time = new Date();
  location: string = 'No Location Set';
  mobileThreshold = 1070;
  isMobile = window.innerWidth < this.mobileThreshold;

  ngOnInit() {
    this.timeInterval = setInterval(() => {
      this.time = new Date();
    }, 1000);

    this.subscriptions.push(
      this.storage.get(topics.location()).subscribe((value) => {
        [this.location] = value.values || ['No Location Set'];
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach((sub) => sub.unsubscribe());
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
  }
}

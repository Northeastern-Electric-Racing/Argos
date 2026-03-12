import { Component, HostListener } from '@angular/core';
import { InfoBackgroundComponent } from '../../../../components/info-background/info-background.component';

import { DividerComponent } from '../../../../components/divider/divider';
import BalancingStatusComponent from '../balancing-status/balancing-status.component';
import ChargingStatusComponent from '../charging-state/charging-status.component';
import VStackComponent from 'src/components/vstack/vstack.component';
import FaultedStatusComponent from '../faulted-status/faulted-status.component';
import ActiveStatusComponent from '../active-status/active-status.component';

@Component({
  selector: 'combined-status-display',
  templateUrl: './combined-status-display.component.html',
  styleUrls: ['./combined-status-display.component.css'],
  standalone: true,
  imports: [
    InfoBackgroundComponent,
    DividerComponent,
    BalancingStatusComponent,
    ChargingStatusComponent,
    VStackComponent,
    FaultedStatusComponent,
    ActiveStatusComponent
  ]
})
export default class CombinedStatusDisplayComponent {
  mobileThreshold = 1070;
  isMobile = window.innerWidth < this.mobileThreshold;
  lightsOn = window.innerWidth >= 1120;

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth <= this.mobileThreshold;
    this.lightsOn = window.innerWidth >= 1120;
  }
}

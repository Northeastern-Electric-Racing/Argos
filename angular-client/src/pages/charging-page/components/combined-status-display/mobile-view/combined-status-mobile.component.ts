import { Component } from '@angular/core';
import { InfoBackgroundComponent } from '../../../../../components/info-background/info-background.component';
import BalancingStatusComponent from '../../balancing-status/balancing-status.component';
import ChargingStatusComponent from '../../charging-state/charging-status.component';
import FaultedStatusComponent from '../../faulted-status/faulted-status.component';
import ActiveStatusComponent from '../../active-status/active-status.component';
import VStackComponent from 'src/components/vstack/vstack.component';



@Component({
    selector: 'combined-status-mobile',
    templateUrl: './combined-status-mobile.component.html',
    styleUrls: ['./combined-status-mobile.component.css'],
    standalone: true,
    imports: [InfoBackgroundComponent,BalancingStatusComponent, ChargingStatusComponent, FaultedStatusComponent, ActiveStatusComponent, VStackComponent]
})
export default class CombinedStatusMobileComponent {}
